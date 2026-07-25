# FinPulse - Stock Market Monitoring Platform

A web application that aggregates market data and fundamental metrics for 20 NIFTY 50 blue-chip Indian companies into a single interactive dashboard.

## Architecture

```
FinPulse/
├── backend/
│   ├── main.py              # FastAPI app, CORS, static serving, startup
│   ├── database.py          # SQLAlchemy engine (SQLite)
│   ├── models.py            # ORM + Pydantic schemas
│   ├── routes/
│   │   ├── stocks.py        # /api/stocks, /api/stocks/{ticker}
│   │   └── market.py        # /api/market-summary
│   ├── services/
│   │   ├── data_fetcher.py  # yFinance data collection
│   │   └── updater.py       # Data refresh orchestration
│   └── requirements.txt
├── frontend/
│   ├── index.html           # Dashboard
│   ├── css/style.css        # Dark theme styling
│   └── js/
│       ├── api.js           # API client
│       ├── charts.js        # Chart.js rendering
│       └── app.js           # DOM logic
├── scripts/
│   └── init_db.sql          # MySQL schema (optional)
├── data/
│   └── finpulse.db          # SQLite database (auto-created)
└── reports/
    └── project_report.md    # One-page report
```

## Setup

### Prerequisites
- Python 3.10+

### 1. Install Dependencies
```bash
cd FinPulse
pip install -r backend/requirements.txt
```

### 2. Run the Application
```bash
python -m backend.main
```

The SQLite database (`data/finpulse.db`) will be created automatically on first run.

Open http://localhost:8000 in your browser.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stocks` | GET | List all 20 tracked stocks with latest metrics |
| `/api/stocks/{ticker}` | GET | Detailed stock info + historical prices |
| `/api/market-summary` | GET | Total market cap, gainers/losers, sector breakdown |
| `/health` | GET | Health check |

## Features

- **20 NIFTY 50 stocks** tracked with real-time data from yFinance
- **Historical price charts** with 1M/3M/6M/1Y/2Y/5Y toggles
- **Fundamental comparison** charts (Market Cap, P/E, EPS, Dividend Yield)
- **Company comparison table** with sortable columns and search
- **Top gainers/losers** panel
- **Sector breakdown** doughnut chart
- **Stock detail view** with comprehensive metrics
- **Dark theme** responsive UI

## Technologies

- **Backend**: Python, FastAPI, SQLAlchemy, yFinance
- **Database**: SQLite (auto-created, zero configuration)
- **Frontend**: HTML/CSS/JavaScript, Chart.js
- **Data Source**: Yahoo Finance API via yFinance

## 20 Tracked Companies

| Ticker | Company | Sector |
|--------|---------|--------|
| RELIANCE | Reliance Industries | Oil & Gas |
| TCS | Tata Consultancy Services | IT |
| HDFCBANK | HDFC Bank | Banking |
| INFY | Infosys | IT |
| ICICIBANK | ICICI Bank | Banking |
| HINDUNILVR | Hindustan Unilever | FMCG |
| ITC | ITC Limited | FMCG |
| SBIN | State Bank of India | Banking |
| BHARTIARTL | Bharti Airtel | Telecom |
| KOTAKBANK | Kotak Mahindra Bank | Banking |
| LT | Larsen & Toubro | Infrastructure |
| AXISBANK | Axis Bank | Banking |
| ASIANPAINT | Asian Paints | Consumer Goods |
| MARUTI | Maruti Suzuki | Automobile |
| HCLTECH | HCL Technologies | IT |
| SUNPHARMA | Sun Pharma | Pharma |
| TATAMOTORS | Tata Motors | Automobile |
| WIPRO | Wipro | IT |
| ULTRACEMCO | UltraTech Cement | Cement |
| NTPC | NTPC Limited | Power |
