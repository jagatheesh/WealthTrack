const MFAPI_BASE = "https://api.mfapi.in";
const AMFI_BASE = "https://portal.amfiindia.com";

const EQUITY_CATEGORY_PATTERNS = [
  ["Large & Mid Cap Fund", /large\s*(?:&|and)\s*mid cap fund/i],
  ["Large Cap Fund", /large cap fund/i],
  ["Mid Cap Fund", /mid cap fund/i],
  ["Small Cap Fund", /small cap fund/i],
  ["Flexi Cap Fund", /flexi cap fund/i],
  ["Multi Cap Fund", /multi cap fund/i],
  ["Focused Fund", /focused fund/i],
  ["Value/Contra Fund", /(value fund|contra fund)/i],
  ["Dividend Yield Fund", /dividend yield fund/i],
  ["ELSS", /\belss\b|tax saver/i]
];

const CATEGORY_ORDER = [
  "Large Cap Fund",
  "Large & Mid Cap Fund",
  "Mid Cap Fund",
  "Small Cap Fund",
  "Flexi Cap Fund",
  "Multi Cap Fund",
  "Focused Fund",
  "Value/Contra Fund",
  "Dividend Yield Fund",
  "ELSS"
];

function decodeHtmlEntities(input) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function stripCdata(text) {
  return text
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "");
}

function normalizeWhitespace(text) {
  return decodeHtmlEntities(stripCdata(text))
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategoryFromTitle(title) {
  for (const [label, pattern] of EQUITY_CATEGORY_PATTERNS) {
    if (pattern.test(title)) return label;
  }
  return null;
}

function extractBaseSchemeName(title) {
  const normalized = title.replace(/\s+/g, " ").trim();
  const planDescriptorIndex = normalized.search(
    /\s*[-–.]\s*(?=(direct|regular|growth|idcw|bonus|institutional|retail|plan|option|income)\b)/i
  );

  let cleaned;
  if (planDescriptorIndex >= 0) {
    cleaned = normalized.slice(0, planDescriptorIndex);
  } else {
    cleaned = normalized;
  }

  return cleaned
    .replace(/\s+(direct|regular|institutional|retail)\s+plan$/i, "")
    .replace(/[-–.\s]+$/, "")
    .trim();
}

function normalizeSchemeKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function scoreMfapiCandidate(displayName, schemeName) {
  const displayKey = normalizeSchemeKey(displayName);
  const schemeKey = normalizeSchemeKey(schemeName || "");
  let score = 0;

  if (schemeKey === displayKey) score += 120;
  if (schemeKey.startsWith(displayKey)) score += 90;
  if (schemeKey.includes(displayKey) || displayKey.includes(schemeKey)) score += 60;
  if (/direct/i.test(schemeName)) score += 20;
  if (/growth/i.test(schemeName)) score += 12;
  if (/idcw/i.test(schemeName)) score -= 10;
  if (/regular/i.test(schemeName)) score -= 6;

  return score;
}

function parseFloatSafe(value) {
  const parsed = parseFloat(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFeedItems(xml) {
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const items = [];
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const descriptionMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const title = titleMatch ? normalizeWhitespace(titleMatch[1]) : "";
    const description = descriptionMatch ? normalizeWhitespace(descriptionMatch[1]) : "";
    const pubDate = pubDateMatch ? normalizeWhitespace(pubDateMatch[1]) : "";
    items.push({ title, description, pubDate });
  }

  return items;
}

function parseAumFromDescription(description) {
  const match = description.match(/Average AUM\(Rs\. in Lacs\)\s*<\/b>\s*<\/td>\s*<td[^>]*>\s*([\d,.]+)/i);
  if (match) return parseFloatSafe(match[1]);

  const fallback = description.match(/Average AUM\(Rs\. in Lacs\)\s*([\d,.]+)/i);
  return fallback ? parseFloatSafe(fallback[1]) : 0;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "MilestoneMoney/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "MilestoneMoney/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

function parseFundHouseFeedIndex(html) {
  const rowRegex = /<tr>\s*<td class="label"><span class="active">([^<]+)<\/span><\/td>[\s\S]*?RssNAV\.aspx\?mf=(\d+)[\s\S]*?RssNAV\.aspx\?swise=y&amp;mf=\2/gi;
  const fundHouses = [];
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    fundHouses.push({
      fundHouse: normalizeWhitespace(match[1]),
      mfId: match[2]
    });
  }

  return fundHouses;
}

async function mapWithConcurrency(items, limit, asyncMapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await asyncMapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function enrichWithMfapi(entry) {
  const query = encodeURIComponent(entry.displayName);
  try {
    const searchResults = await fetchJson(`${MFAPI_BASE}/mf/search?q=${query}`);
    const preferred = [...(searchResults || [])]
      .filter((item) => item && item.schemeName)
      .sort((left, right) => scoreMfapiCandidate(entry.displayName, right.schemeName) - scoreMfapiCandidate(entry.displayName, left.schemeName))[0];

    if (!preferred) return entry;

    const latest = await fetchJson(`${MFAPI_BASE}/mf/${preferred.schemeCode}/latest`);
    return {
      ...entry,
      schemeCode: preferred.schemeCode,
      latestNav: latest && latest.data && latest.data[0] ? latest.data[0].nav : null,
      latestNavDate: latest && latest.data && latest.data[0] ? latest.data[0].date : null,
      mfapiSchemeName: latest && latest.meta ? latest.meta.scheme_name : preferred.schemeName,
      mfapiCategory: latest && latest.meta ? latest.meta.scheme_category : null,
      fundHouse: latest && latest.meta ? latest.meta.fund_house : entry.fundHouse
    };
  } catch (error) {
    return {
      ...entry,
      enrichmentError: error.message
    };
  }
}

exports.handler = async function handler() {
  try {
    const indexHtml = await fetchText(`${AMFI_BASE}/rssShowFeeds.aspx`);
    const fundHouseFeeds = parseFundHouseFeedIndex(indexHtml);

    const allEntriesNested = await mapWithConcurrency(fundHouseFeeds, 6, async ({ fundHouse, mfId }) => {
      const aumXml = await fetchText(`${AMFI_BASE}/RssNAV.aspx?swise=y&mf=${mfId}`);
      const aumItems = parseFeedItems(aumXml);

      return aumItems
        .map((item) => {
          const category = inferCategoryFromTitle(item.title);
          if (!category) return null;

          return {
            fundHouse,
            schemeTitle: item.title,
            baseSchemeName: extractBaseSchemeName(item.title),
            category,
            aumLacs: parseAumFromDescription(item.description),
            asOf: item.pubDate
          };
        })
        .filter((item) => item && item.aumLacs > 0);
    });

    const grouped = new Map();

    for (const entry of allEntriesNested.flat()) {
      const key = `${entry.category}||${normalizeSchemeKey(entry.baseSchemeName)}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          category: entry.category,
          displayName: entry.baseSchemeName,
          fundHouse: entry.fundHouse,
          aumLacs: entry.aumLacs,
          aumCrores: entry.aumLacs / 100,
          variants: [entry.schemeTitle],
          asOf: entry.asOf
        });
      } else {
        existing.aumLacs += entry.aumLacs;
        existing.aumCrores = existing.aumLacs / 100;
        existing.variants.push(entry.schemeTitle);
      }
    }

    const byCategory = {};
    for (const item of grouped.values()) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }

    const shortlisted = [];
    for (const [category, funds] of Object.entries(byCategory)) {
      funds.sort((a, b) => b.aumCrores - a.aumCrores);
      byCategory[category] = funds.slice(0, 5);
      shortlisted.push(...byCategory[category]);
    }

    const enriched = await mapWithConcurrency(shortlisted, 4, enrichWithMfapi);
    const enrichmentMap = new Map(
      enriched.map((item) => [`${item.category}||${normalizeSchemeKey(item.displayName)}`, item])
    );

    for (const [category, funds] of Object.entries(byCategory)) {
      byCategory[category] = funds.map((item) => {
        const key = `${item.category}||${normalizeSchemeKey(item.displayName)}`;
        return enrichmentMap.get(key) || item;
      });
    }

    const orderedCategories = Object.keys(byCategory).sort((a, b) => {
      const left = CATEGORY_ORDER.indexOf(a);
      const right = CATEGORY_ORDER.indexOf(b);
      if (left === -1 && right === -1) return a.localeCompare(b);
      if (left === -1) return 1;
      if (right === -1) return -1;
      return left - right;
    });

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=1800"
      },
      body: JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: {
          mfapi: "https://api.mfapi.in",
          amfi: "https://portal.amfiindia.com"
        },
        orderedCategories,
        categories: byCategory
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        error: "Unable to build top equity fund list right now.",
        detail: error.message
      })
    };
  }
};
