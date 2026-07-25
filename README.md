# FinPulse - Stock Market Monitoring Dashboard

A full-stack web application that tracks 20 NIFTY 50 blue-chip Indian stocks with real-time market data, interactive charts, portfolio management, and AI-powered insights. Built as part of the AlgoLabs Assignment for SoFI Core Inductions.

**Live URL:** [https://fin-pulse-992n.vercel.app](https://fin-pulse-992n.vercel.app)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [API Documentation](#api-documentation)
- [Frontend Architecture](#frontend-architecture)
- [Data Pipeline](#data-pipeline)
- [Deployment](#deployment)
- [Tracked Stocks](#tracked-stocks)

---

## Project Overview

FinPulse aggregates real-time market data from Yahoo Finance for 20 NIFTY 50 companies and presents it through an interactive dashboard. The backend fetches and caches stock data (prices, fundamentals) in a SQLite database, while the frontend renders it using Chart.js with a dark/light theme UI.

**Problem Solved:** Consolidating scattered stock market information into a single, fast, and visually appealing dashboard that supports comparison, screening, and analysis — without requiring paid data subscriptions.

---

## Features

### Core
- **Market Overview** — Top gainers/losers, total market cap, tracked stock count
- **Stock Detail View** — Click any stock for full metrics + interactive candlestick/line charts with volume overlay
- **Candlestick Charts** — Custom Chart.js plugin rendering OHLC candles with volume bars
- **Historical Price Charts** — Period toggles: 1M, 3M, 6M, 1Y, 2Y
- **Stock Comparison** — Overlay normalized price performance of any two stocks
- **Fundamental Comparison** — Bar charts comparing Market Cap, P/E Ratio, EPS, Dividend Yield
- **Financial Ratio Heatmap** — Color-coded grid (P/E, EPS, Div Yield, Book Value) with quartile-based classification

### Portfolio & Analysis
- **Portfolio Watchlist** — Add/remove stocks, persisted in localStorage, with performance chart
- **Sector-wise Dashboard** — Sector market cap distribution, pie chart, sector comparison by metric
- **Custom Stock Screener** — Filter by market cap range, P/E range, EPS minimum, sector
- **AI-Powered Insights** — Auto-generated market analysis: momentum, valuation alerts, value opportunities, dividend champions, sector analysis, size factor comparison

### UI/UX
- **Light/Dark Theme Toggle** — Full theme support with localStorage persistence
- **Market Status Badge** — Real-time IST clock showing open/closed/weekend status
- **PDF Export** — Print-optimized layout for report generation
- **Responsive Design** — Works on desktop and mobile (sidebar collapses)
- **Smooth Animations** — fadeInUp card animations, loading overlay with spinner

---

## Architecture

```
FinPulse/
├── api/
│   └── index.py                  # Vercel serverless entry point
├── backend/
│   ├── main.py                   # FastAPI app, lifespan, CORS, static serving
│   ├── database.py               # SQLAlchemy engine (SQLite), session management
│   ├── models.py                 # ORM models (Company, StockPrice, Fundamental)
│   │                             #   + Pydantic response schemas
│   ├── routes/
│   │   ├── stocks.py             # GET /api/stocks, GET /api/stocks/{ticker}
│   │   │                         #   + inline yfinance data fetching
│   │   └── market.py             # GET /api/market-summary
│   └── services/
│       ├── data_fetcher.py       # yFinance API wrapper, batch download,
│       │                         #   individual ticker fetching
│       └── updater.py            # Data load orchestration, on-demand fetch
├── frontend/
│   ├── index.html                # Dashboard SPA with tab navigation
│   ├── css/
│   │   └── style.css             # Full theme system (dark/light), responsive
│   └── js/
│       ├── api.js                # Fetch wrapper for REST endpoints
│       ├── charts.js             # All Chart.js rendering (candlestick, line,
│       │                         #   bar, doughnut, heatmap, compare, sector)
│       └── app.js                # DOM logic, event handlers, tab navigation,
│                                 #   watchlist CRUD, screener, AI insights
├── vercel.json                   # Vercel deployment config
├── requirements.txt              # Python dependencies
└── data/
    └── finpulse.db               # SQLite database (auto-created at runtime)
```

### Data Flow

```
Yahoo Finance API (yfinance)
        ↓
  Backend (FastAPI)
  ├── Batch download: yf.download() for price data (5d history)
  ├── Individual: yf.Ticker().info for fundamentals (P/E, EPS, etc.)
  ├── SQLite caching (data/finpulse.db or /tmp on Vercel)
  └── REST API endpoints
        ↓
  Frontend (Chart.js + Vanilla JS)
  ├── Overview: gainers/losers, charts, heatmap
  ├── Detail: candlestick with volume, metrics
  ├── Watchlist: localStorage-backed portfolio
  ├── Sectors: bar, pie, comparison charts
  ├── Screener: client-side filtering
  └── AI Insights: rule-based analysis engine
```

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python 3.11** | Runtime |
| **FastAPI** | REST API framework with async support |
| **SQLAlchemy** | ORM for SQLite database |
| **SQLite** | Embedded database (zero config) |
| **yFinance** | Yahoo Finance API wrapper for stock data |
| **Pandas** | Data processing (used by yFinance internally) |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Vanilla JavaScript** | DOM manipulation, event handling, SPA routing |
| **HTML5 / CSS3** | Semantic markup with CSS custom properties for theming |
| **Chart.js 4.4** | All chart rendering (line, bar, doughnut) |
| **Custom Candlestick Plugin** | Hand-written Chart.js plugin for OHLC candle rendering |
| **CSS Variables** | Dark/light theme system via `data-theme` attribute |

### External APIs & Libraries
| Source | Usage |
|--------|-------|
| **Yahoo Finance API** (via yFinance) | Stock prices, historical data, fundamental metrics |
| **Chart.js** (CDN) | Interactive charts and visualizations |
| **Google Fonts** (Inter) | Typography |

### Deployment
| Service | Purpose |
|---------|---------|
| **Vercel** | Serverless deployment (Python runtime) |
| **GitHub** | Version control |

---

## Setup & Installation

### Prerequisites
- Python 3.10+
- pip

### Local Development

```bash
# Clone the repository
git clone https://github.com/Jay1202-crypto/FinPulse.git
cd FinPulse

# Install dependencies
pip install -r requirements.txt

# Run the application
python -m backend.main
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

The SQLite database (`data/finpulse.db`) is created automatically on first run. Data is fetched from Yahoo Finance on first load (~30-60 seconds).

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `data/finpulse.db` | SQLite database path (auto-set to `/tmp/finpulse.db` on Vercel) |

---

## API Documentation

### `GET /api/stocks`
Returns all 20 tracked stocks with latest price and fundamental data.

**Response:**
```json
[
  {
    "ticker": "RELIANCE.NS",
    "name": "Reliance Industries",
    "sector": "Oil & Gas",
    "exchange": "NSE",
    "latest_close": 1278.0,
    "market_cap": 17294499512320,
    "pe_ratio": 23.15,
    "eps": 55.21,
    "dividend_yield": 0.47,
    "book_value": 668.05
  }
]
```

### `GET /api/stocks/{ticker}?period=1y`
Returns detailed stock data including historical OHLCV prices.

**Parameters:**
- `ticker` — Stock ticker (e.g., `RELIANCE.NS`)
- `period` — Price history period: `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`

### `GET /api/market-summary`
Returns total market cap, top 5 gainers/losers, and sector breakdown.

### `GET /health`
Health check endpoint.

---

## Frontend Architecture

### Tab System
The dashboard uses a client-side tab system with 5 main views:
- **Overview** — Market metrics, gainers/losers, fundamental charts, heatmap
- **Watchlist** — Portfolio tracking with localStorage persistence
- **Sectors** — Sector-wise analysis with multiple chart types
- **Screener** — Custom stock filtering by financial metrics
- **AI Insights** — Auto-generated market analysis

### Chart System (`charts.js`)
All charts are theme-aware — colors adapt to dark/light mode via `getPalette()` which reads the `data-theme` attribute. Charts include:
- **Candlestick** — Custom Chart.js plugin drawing OHLC candles + wicks + volume overlay
- **Line** — Price history with gradient fill
- **Bar** — Fundamental comparisons, sector metrics
- **Doughnut** — Sector breakdown
- **Heatmap** — CSS grid with quartile-based color coding

### Theme System
Uses `data-theme` attribute on `<html>` with CSS custom properties:
- Dark mode (default): Deep blue palette
- Light mode: Clean white/gray palette
- Persisted in `localStorage`
- All charts re-render on theme switch

---

## Data Pipeline

### On First Load
1. FastAPI lifespan creates SQLite tables
2. `ensure_companies_exist()` seeds 20 NIFTY 50 companies
3. `yf.download(tickers, period="5d")` batch-fetches 5 days of OHLCV data for all 20 stocks in a single API call
4. Individual `yf.Ticker(ticker).info` calls fetch fundamental metrics (P/E, EPS, market cap, etc.)
5. Data is cached in SQLite — subsequent requests read from DB

### On Stock Detail Request
1. Check if historical data exists in DB
2. If not, fetch full period history via `yf.Ticker(ticker).history(period=...)`
3. Check if fundamentals exist; fetch if missing
4. Return complete data with OHLCV history

### On Vercel (Serverless)
- Database stored in `/tmp/finpulse.db` (ephemeral)
- Data re-fetched on each cold start
- Stays cached while function instance is warm

---

## Deployment

### Vercel
1. Connect GitHub repo to Vercel
2. Auto-detected as FastAPI project
3. Build: `pip install -r requirements.txt`
4. Entry point: `api/index.py` → imports FastAPI app
5. All routes forwarded to the serverless function

### Local
```bash
python -m backend.main
# Runs on http://localhost:8000
```

---

## Tracked Stocks (NIFTY 50)

| Ticker | Company | Sector |
|--------|---------|--------|
| RELIANCE.NS | Reliance Industries | Oil & Gas |
| TCS.NS | Tata Consultancy Services | IT |
| HDFCBANK.NS | HDFC Bank | Banking |
| INFY.NS | Infosys | IT |
| ICICIBANK.NS | ICICI Bank | Banking |
| HINDUNILVR.NS | Hindustan Unilever | FMCG |
| ITC.NS | ITC Limited | FMCG |
| SBIN.NS | State Bank of India | Banking |
| BHARTIARTL.NS | Bharti Airtel | Telecom |
| KOTAKBANK.NS | Kotak Mahindra Bank | Banking |
| LT.NS | Larsen & Toubro | Infrastructure |
| AXISBANK.NS | Axis Bank | Banking |
| ASIANPAINT.NS | Asian Paints | Consumer Goods |
| MARUTI.NS | Maruti Suzuki | Automobile |
| HCLTECH.NS | HCL Technologies | IT |
| SUNPHARMA.NS | Sun Pharma | Pharma |
| TATAMOTORS.NS | Tata Motors | Automobile |
| WIPRO.NS | Wipro | IT |
| ULTRACEMCO.NS | UltraTech Cement | Cement |
| NTPC.NS | NTPC Limited | Power |

---

## License

This project was built for the AlgoLabs Assignment (SoFI Core Inductions).
