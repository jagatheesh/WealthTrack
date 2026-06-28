# WealthTrack

A beautiful, professional SIP (Systematic Investment Plan) calculator with inflation adjustment and Tufte-style data visualization.

## Features

- 💵 **Multi-Currency Support**: USD and INR (with Lakhs and Crores units)
- 📊 **Inflation Adjustment**: Calculate real purchasing power over time
- 📈 **Beautiful Charts**: Tufte-style minimalist visualization
- 🎨 **Professional UI**: Clean, modern design aesthetic
- ⏱️ **Time Tracking**: Add custom age or milestone variables
- 📱 **Responsive Design**: Works on desktop and mobile

## Table of Contents

- [Quick Start](#quick-start)
- [Setup Instructions](#setup-instructions)
- [Running Locally](#running-locally)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Technology Stack](#technology-stack)
- [Usage](#usage)
- [License](#license)

## Quick Start

1. Open `index.html` in any modern browser
2. Enter your initial corpus, monthly SIP, expected returns, inflation, and variables
3. Watch your corpus grow over 30 years!

## Setup Instructions

### Option 1: Clone the Repository

```bash
git clone https://github.com/jagatheesh/WealthTrack.git
cd WealthTrack
```

### Option 2: Download as ZIP

1. Go to https://github.com/jagatheesh/WealthTrack
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file to your preferred location

### Option 3: Fork the Repository (for contributors)

1. Go to https://github.com/jagatheesh/WealthTrack
2. Click the "Fork" button at the top-right
3. Clone your forked repository

## Running Locally

### Method 1: Directly Open in Browser

The simplest way! Just:

1. Navigate to the project directory
2. Double-click `index.html` to open it in your default browser
3. You're ready to go!

### Method 2: Python HTTP Server (Recommended)

For a better development experience (if you plan to make changes):

**Python 3.x:**
```bash
cd WealthTrack
python3 -m http.server 8000
```

Then open your browser and visit: `http://localhost:8000`

**Python 2.x:**
```bash
cd WealthTrack
python -m SimpleHTTPServer 8000
```

### Method 3: Node.js HTTP Server

If you have Node.js installed:

```bash
cd WealthTrack
npx http-server -p 8000 -c-1
```

Then open your browser and visit: `http://localhost:8000`

## Deploying to GitHub Pages

1. Go to your repository: https://github.com/jagatheesh/WealthTrack
2. Click "Settings"
3. Scroll down to the "Pages" section
4. Under "Build and deployment":
   - Source: "Deploy from a branch"
   - Branch: "main"
   - Folder: "/ (root)"
5. Click "Save"
6. Wait a few minutes for the deployment to complete
7. Your calculator will be available at: `https://jagatheesh.github.io/WealthTrack`

## Technology Stack

- Pure HTML, CSS, JavaScript (no frameworks!)
- Chart.js for beautiful data visualization

## Usage

### Default Configuration

- **Currency**: INR (Crores)
- **Initial Corpus**: ₹1 crore
- **Monthly SIP**: ~₹4.17 lakhs (₹50 lakhs/year)
- **Annual Return**: 7%
- **Inflation Rate**: 4%
- **Starting Year**: 2026

### Customization

- Add custom variables (like "My Age" and "Boy's Age")
- Toggle between different INR units
- Adjust return and inflation rates as needed
- View both nominal and inflation-adjusted values

## Screenshot

The calculator features a clean, modern interface with:

- Subtle gradient background
- Professional white container with soft shadows
- Minimalist charts with high data-ink ratio
- Clean table layout

## License

MIT License

## Author

Jagatheesh
