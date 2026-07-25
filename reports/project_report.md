# FinPulse - Project Report

**AlgoLabs Assignment 1 - SoFI Core Inductions**

## Project Overview
FinPulse is a stock market monitoring platform that aggregates financial market data and fundamental metrics for 20 NIFTY 50 blue-chip Indian companies into a single interactive dashboard. The application fetches, stores, and visualizes real-time and historical market data.

## Architecture

### Backend (FastAPI + SQLAlchemy)
- **Framework**: FastAPI with async support and automatic OpenAPI docs
- **ORM**: SQLAlchemy with MySQL driver (PyMySQL)
- **Data Source**: yFinance library for Yahoo Finance API access
- **Design**: RESTful API with 3 endpoints, service layer for data fetching

### Database (MySQL)
- **companies**: Stores ticker, name, sector, exchange for each tracked stock
- **stock_prices**: Historical OHLCV data indexed on (ticker, date)
- **fundamentals**: Market cap, P/E, EPS, dividend yield, book value indexed on (ticker, date)

### Frontend (HTML/CSS/JS + Chart.js)
- **Framework**: Vanilla JavaScript with modular file structure
- **Visualization**: Chart.js for price charts, bar charts, and doughnut charts
- **Design**: Responsive dark theme with CSS Grid layout

## APIs Used

1. **Yahoo Finance API** (via yFinance) - Stock prices, historical data, fundamental metrics
2. **FastAPI REST API** - Internal API serving processed data to frontend

## Database Design

```
companies (ticker PK, name, sector, exchange)
    |
    ├── stock_prices (ticker FK, trade_date, OHLCV)
    └── fundamentals (ticker FK, data_date, market_cap, pe_ratio, eps, ...)
```

Composite unique keys prevent duplicate entries. Indexes optimize date-range queries for chart rendering.

## Features Implemented

1. **Stock Tracking**: 20 NIFTY 50 companies with live and historical data
2. **REST API**: 3 endpoints (/api/stocks, /api/stocks/{ticker}, /api/market-summary)
3. **Interactive Dashboard**:
   - Historical price charts with period toggles (1M-5Y)
   - Fundamental comparison bar charts (Market Cap, P/E, EPS, Dividend Yield)
   - Sortable company comparison table with search
   - Top gainers/losers panels
   - Sector breakdown doughnut chart
   - Detailed stock view with comprehensive metrics
4. **Data Storage**: MySQL database with efficient indexing
5. **Auto-Refresh**: One-click data refresh button

## Challenges Faced

1. **Data Volume**: Fetching 1 year of historical data for 20 stocks takes time on first run; solved with background thread loading
2. **yFinance Rate Limits**: Implemented error handling and logging for API failures
3. **Cross-Origin Requests**: Configured CORS middleware for frontend-backend communication
4. **Static File Serving**: Mounted frontend directory via FastAPI's StaticFiles for single-process deployment

## Future Improvements

1. **Deployment**: Deploy to Render/Railway with cloud MySQL instance
2. **Real-time Updates**: WebSocket connection for live price streaming
3. **Watchlist**: User-configurable stock watchlist
4. **Candlestick Charts**: OHLC candlestick visualization
5. **Alerts**: Price and volume alert notifications
6. **Portfolio Tracker**: Track personal holdings and P&L
7. **Export**: PDF report generation for stock analysis
8. **Authentication**: User login for personalized experience

## External Dependencies

- **yfinance** - Yahoo Finance data access
- **FastAPI** - Web framework
- **SQLAlchemy** - Database ORM
- **PyMySQL** - MySQL connector
- **Chart.js** - Frontend charting library
