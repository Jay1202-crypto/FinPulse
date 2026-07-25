# FinPulse — Complete Study Guide

Everything you need to know about this project for your interview. Read this before you go in.

---

## TABLE OF CONTENTS

1. [Project at a Glance](#1-project-at-a-glance)
2. [How It Started — Every Decision](#2-how-it-started--every-decision)
3. [Architecture Deep Dive](#3-architecture-deep-dive)
4. [Backend — Line by Line](#4-backend--line-by-line)
5. [Frontend — Line by Line](#5-frontend--line-by-line)
6. [Data Pipeline](#6-data-pipeline)
7. [All Challenges & Solutions](#7-all-challenges--solutions)
8. [Deployment Story](#8-deployment-story)
9. [Interview Q&A](#9-interview-qa)
10. [Quick Reference](#10-quick-reference)

---

## 1. PROJECT AT A GLANCE

**What:** A stock market dashboard tracking 20 NIFTY 50 Indian stocks
**Why:** AlgoLabs Assignment for SoFI Core Inductions
**Stack:** Python (FastAPI) + SQLite + Vanilla JS + Chart.js
**Deploy:** Vercel (serverless)
**Lines of code:** ~2,400 total
**Time to build:** Single development session

**URLs:**
- Live: https://fin-pulse-992n.vercel.app
- Repo: https://github.com/Jay1202-crypto/FinPulse

---

## 2. HOW IT STARTED — EVERY DECISION

### Decision 1: Python over Node.js for backend
**Question:** Why Python?
**Answer:** yFinance (Yahoo Finance Python library) is the best free stock data API. Python has the strongest data science ecosystem. FastAPI is modern, fast, and auto-generates API docs. Node.js would require a different finance API.

### Decision 2: FastAPI over Flask/Django
**Question:** Why FastAPI?
**Answer:** 
- Flask is older, no built-in async, no auto docs
- Django is overkill for a REST API (ORM, admin panel, etc. not needed)
- FastAPI has: auto-generated Swagger docs, Pydantic validation, async support, modern Python (type hints), excellent performance
- Built-in request validation via Pydantic models saves boilerplate

### Decision 3: SQLite over PostgreSQL/MySQL
**Question:** Why SQLite?
**Answer:**
- Zero configuration — no server to set up
- Single file database — easy to manage
- Works on Vercel's ephemeral `/tmp` filesystem
- Perfect for a single-user/small-scale app
- SQLAlchemy ORM works with SQLite seamlessly
- For production with many users, would switch to PostgreSQL

### Decision 4: Vanilla JS over React/Vue
**Question:** Why no frontend framework?
**Answer:**
- No build step needed (no npm, no webpack, no vite)
- Simpler deployment — just static files
- Full control over Chart.js plugin for candlesticks
- Project scope doesn't need component reusability
- Faster to develop for a single-page dashboard
- Less deployment complexity on Vercel

### Decision 5: Chart.js over D3.js/Plotly
**Question:** Why Chart.js?
**Answer:**
- Lighter weight (~60KB) vs D3 (~200KB) or Plotly (~3MB)
- Good enough for our chart types (line, bar, doughnut)
- Plugin system allowed building custom candlestick renderer
- Clean API, good documentation
- D3 would be overkill for standard charts
- Plotly is too heavy for a fast dashboard

### Decision 6: yFinance as data source
**Question:** Why Yahoo Finance?
**Answer:**
- Free — no API key needed
- Covers NSE/BSE (Indian stocks) with `.NS` suffix
- Provides: prices, fundamentals, historical data
- Alternatives: Alpha Vantage (rate limited), NSE website (scraping, unreliable), paid APIs (not allowed for assignment)

### Decision 7: Dark theme by default
**Question:** Why dark mode first?
**Answer:**
- Financial dashboards conventionally use dark themes (Bloomberg Terminal, TradingView)
- Easier on eyes for data-heavy interfaces
- Colors pop more on dark backgrounds (green/red for stocks)
- Light mode added as an option via theme toggle

### Decision 8: Tab-based navigation over SPA router
**Question:** Why not use a router library?
**Answer:**
- Only 5 views (Overview, Watchlist, Sectors, Screener, Insights)
- A simple `switchTab()` function that toggles CSS classes is sufficient
- No URL-based routing needed for this use case
- Keeps the frontend zero-dependency

### Decision 9: localStorage for watchlist
**Question:** Why localStorage instead of database?
**Answer:**
- No user accounts needed (assignment scope)
- Instant reads/writes, no API calls
- Persists across sessions
- No server storage cost
- For a real app with multiple users, would use a database

### Decision 10: Custom candlestick chart
**Question:** Why build your own?
**Answer:**
- No good free candlestick library for Chart.js
- Lightweight-charts (TradingView) is separate from Chart.js
- Building a custom plugin demonstrates understanding of Chart.js internals
- Used `afterDatasetsDraw` hook to manually draw OHLC candles on canvas

---

## 3. ARCHITECTURE DEEP DIVE

### System Architecture
```
User's Browser
    │
    ├── GET / (index.html)  ──────────────────→  FastAPI serves static file
    ├── GET /static/css/*   ──────────────────→  FastAPI StaticFiles mount
    ├── GET /static/js/*    ──────────────────→  FastAPI StaticFiles mount
    │
    ├── GET /api/stocks     ──────────────────→  stocks.py → yFinance → SQLite → JSON
    ├── GET /api/stocks/TCS ──────────────────→  stocks.py → yFinance → SQLite → JSON
    ├── GET /api/market-summary ──────────────→  market.py → SQLite → JSON
    └── GET /health         ──────────────────→  Returns {"status": "ok"}
```

### Request Flow for /api/stocks
```
1. FastAPI receives GET /api/stocks
2. stocks.py:list_stocks() runs
3. Queries Company table → 20 companies found
4. Checks if StockPrice table has any data
5. If NO data:
   a. Calls yf.download(tickers, period="5d") — batch fetch
   b. Stores 5 days of OHLCV for each stock
   c. Loops through tickers, calls yf.Ticker(ticker).info for fundamentals
   d. Stores P/E, EPS, market cap, dividend yield, book value
6. For each company, queries latest StockPrice + Fundamental
7. Returns JSON array of 20 StockResponse objects
```

### Request Flow for /api/stocks/{ticker}
```
1. FastAPI receives GET /api/stocks/TCS.NS?period=1y
2. stocks.py:get_stock() runs
3. Validates ticker exists in Company table
4. Checks if StockPrice data exists for this ticker
5. If NO: fetches full period history via yf.Ticker().history()
6. Checks if Fundamental data exists
7. If NO: fetches via yf.Ticker().info
8. Queries StockPrice for the requested period
9. Returns StockDetailResponse with historical_prices array
```

### Frontend State Flow
```
DOMContentLoaded
    │
    ├── initTheme() → reads localStorage, sets data-theme attribute
    └── init()
         ├── showLoading() → shows overlay
         ├── initEventListeners() → binds all buttons/tabs
         ├── updateMarketStatus() → IST clock check
         ├── Promise.all([loadMarketSummary(), loadStocks()])
         │    ├── loadMarketSummary() → fetch /api/market-summary
         │    │    ├── Updates metric cards (MCap, tracked count)
         │    │    ├── Renders gainers/losers lists
         │    │    └── Renders sector doughnut chart
         │    └── loadStocks() → fetch /api/stocks
         │         ├── Renders sidebar stock list
         │         ├── Populates compare dropdowns
         │         ├── Renders fundamental bar chart
         │         └── Renders heatmap
         └── hideLoading() → hides overlay
```

---

## 4. BACKEND — LINE BY LINE

### main.py — Application Entry Point
```python
# What it does: Sets up FastAPI app, routes, static files, database init

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs ONCE when the server starts
    Base.metadata.create_all(bind=engine)  # Creates SQLite tables
    db = SessionLocal()
    initial_data_load(db)  # Seeds 20 companies into DB
    db.close()
    yield  # Server is now running
    # Cleanup happens after server stops

app = FastAPI(lifespan=lifespan)  # Registers the startup function

app.mount("/static", StaticFiles(directory="frontend"))
# This makes /static/css/style.css serve frontend/css/style.css
# And /static/js/app.js serve frontend/js/app.js

@app.get("/")
def serve_dashboard():
    return FileResponse("frontend/index.html")
# Serves the SPA for any root URL
```

### database.py — Database Configuration
```python
# Detects if running on Vercel (VERCEL env var exists)
if os.getenv("VERCEL"):
    DB_PATH = "/tmp/finpulse.db"  # Vercel's writable directory
else:
    DB_PATH = "data/finpulse.db"  # Local development

DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
# check_same_thread=False required for SQLite with FastAPI's async
```

### models.py — Database Models + API Schemas
```python
# ORM Models (database tables)
class Company(Base):
    __tablename__ = "companies"
    ticker = Column(String, primary_key=True)  # "TCS.NS"
    name = Column(String)                      # "Tata Consultancy Services"
    sector = Column(String)                    # "IT"
    exchange = Column(String)                  # "NSE"

class StockPrice(Base):
    __tablename__ = "stock_prices"
    ticker = Column(String)
    trade_date = Column(Date)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)
    # Composite primary key: (ticker, trade_date)

class Fundamental(Base):
    __tablename__ = "fundamentals"
    ticker = Column(String)
    data_date = Column(Date)
    market_cap = Column(Float)      # In INR
    pe_ratio = Column(Float)        # Price to Earnings
    eps = Column(Float)             # Earnings Per Share
    dividend_yield = Column(Float)  # As decimal (0.02 = 2%)
    book_value = Column(Float)      # Per share

# Pydantic Schemas (API response shapes)
class StockResponse(BaseModel):
    ticker: str
    name: str
    sector: str | None
    latest_close: float | None
    market_cap: float | None
    pe_ratio: float | None
    # ... etc
```

### routes/stocks.py — Stock Endpoints
```python
@router.get("", response_model=list[StockResponse])
def list_stocks(db: Session = Depends(get_db)):
    # 1. Get all companies from DB
    companies = db.query(Company).all()
    
    # 2. Check if we have price data
    has_data = db.query(StockPrice).first()
    if not has_data:
        # 3. First time: fetch everything from Yahoo Finance
        _fetch_live_overview(db)
    
    # 4. For each company, get latest price + fundamentals
    for c in companies:
        latest_price = db.query(StockPrice)...
        latest_fund = db.query(Fundamental)...
        results.append(StockResponse(...))
    
    return results

def _fetch_live_overview(db: Session):
    # Batch download: ONE API call for all 20 stocks
    batch = yf.download(tickers, period="5d", group_by="ticker")
    # This returns a multi-level DataFrame:
    #   Column level 0: ticker name ("TCS.NS", "RELIANCE.NS", ...)
    #   Column level 1: metric ("Open", "High", "Low", "Close", "Volume")
    
    # Store 5 days of data per stock
    for ticker in tickers:
        df = batch[ticker]  # Get this stock's data
        for row_date, row in df.iterrows():
            db.add(StockPrice(ticker=ticker, trade_date=row_date.date(), ...))
    
    # Fetch fundamentals individually (slower, ~2s per stock)
    for ticker in tickers:
        info = yf.Ticker(ticker).info  # Returns dict with all fundamentals
        db.add(Fundamental(
            market_cap=info.get("marketCap"),
            pe_ratio=info.get("trailingPE"),
            eps=info.get("trailingEps"),
            # ...
        ))
```

### routes/market.py — Market Summary
```python
_fetch_lock = threading.Lock()  # Prevents two requests from fetching simultaneously

def ensure_data(db: Session):
    has_data = db.query(StockPrice).first()
    if not has_data:
        if _fetch_lock.acquire(blocking=False):  # Non-blocking lock
            try:
                _fetch_live_overview(db)
            finally:
                _fetch_lock.release()

@router.get("", response_model=MarketSummaryResponse)
def market_summary(db: Session = Depends(get_db)):
    ensure_data(db)  # Make sure data exists
    
    # Calculate market metrics from DB data
    for c in companies:
        # Get current price and previous price
        current = latest_price.close
        previous = prev_price.close
        change_pct = ((current - previous) / previous) * 100
        
        # Aggregate by sector
        sector_map[sector]["market_cap"] += market_cap
    
    # Sort by change_pct for gainers/losers
    stock_data.sort(key=lambda x: x["change_pct"], reverse=True)
    top_gainers = stock_data[:5]     # Best 5
    top_losers = stock_data[-5:][::-1]  # Worst 5, reversed
```

### services/data_fetcher.py — yFinance Wrapper
```python
# Batch download (fast — one API call for all stocks)
def fetch_batch_prices(tickers, period="5d"):
    return yf.download(tickers, period=period, group_by="ticker", threads=True)
    # threads=True uses parallel downloads internally

# Individual stock info (slow — separate API call per stock)
def fetch_fundamentals(ticker):
    stock = yf.Ticker(ticker)
    info = stock.info  # Makes HTTP request to Yahoo Finance
    return {
        "market_cap": info.get("marketCap"),      # e.g., 17294499512320
        "pe_ratio": info.get("trailingPE"),        # e.g., 23.15
        "eps": info.get("trailingEps"),            # e.g., 55.21
        "dividend_yield": info.get("dividendYield"), # e.g., 0.0047 (0.47%)
        "book_value": info.get("bookValue"),       # e.g., 668.05
    }

# Historical price data
def fetch_history(ticker, period="1y"):
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)
    # Returns DataFrame with columns: Open, High, Low, Close, Volume
    # Index is DatetimeIndex
```

---

## 5. FRONTEND — LINE BY LINE

### index.html — Structure
```html
<!-- 5 tabs for navigation -->
<nav class="nav-tabs">
    <button class="nav-tab active" data-tab="overview">Overview</button>
    <button class="nav-tab" data-tab="watchlist">Watchlist</button>
    <button class="nav-tab" data-tab="sectors">Sectors</button>
    <button class="nav-tab" data-tab="screener">Screener</button>
    <button class="nav-tab" data-tab="insights">AI Insights</button>
</nav>

<!-- Each tab is a section, only one visible at a time -->
<section class="tab-content active" id="tab-overview">
    <!-- Metric cards, charts, heatmap -->
</section>

<section class="tab-content" id="tab-detail">
    <!-- Stock detail view (shown when clicking a stock) -->
</section>

<!-- Theme toggle button -->
<button class="theme-toggle" id="theme-toggle">
    <svg class="icon-sun">...</svg>  <!-- Shown in dark mode -->
    <svg class="icon-moon">...</svg> <!-- Shown in light mode -->
</button>
```

### css/style.css — Theme System
```css
/* Default: Dark mode */
:root {
    --bg-body: #050a15;
    --bg-sidebar: #0a1020;
    --bg-card: rgba(12, 20, 40, 0.7);
    --text-primary: #f0f2f5;
    --accent: #60a5fa;
    --green: #34d399;
    --red: #f87171;
    /* ... etc */
}

/* Light mode overrides */
[data-theme="light"] {
    --bg-body: #f3f4f6;
    --bg-sidebar: #ffffff;
    --bg-card: rgba(255, 255, 255, 0.85);
    --text-primary: #111827;
    --accent: #3b82f6;
    --green: #059669;
    --red: #dc2626;
    /* ... etc */
}

/* Theme toggle icon visibility */
[data-theme="dark"] .icon-sun { display: block; }
[data-theme="dark"] .icon-moon { display: none; }
[data-theme="light"] .icon-sun { display: none; }
[data-theme="light"] .icon-moon { display: block; }

/* Print styles for PDF export */
@media print {
    .sidebar, .topbar, .nav-tabs { display: none !important; }
    .content { margin-left: 0; }
    .card { break-inside: avoid; }
}
```

### js/app.js — Core Logic
```javascript
// Tab switching
function switchTab(tabName) {
    // Remove 'active' from all tabs and sections
    document.querySelectorAll('.nav-tab').forEach(t => 
        t.classList.toggle('active', t.dataset.tab === tabName));
    document.querySelectorAll('.tab-content').forEach(s => 
        s.classList.remove('active'));
    // Show the selected section
    document.getElementById('tab-' + tabName).classList.add('active');
    
    // Trigger data load for the tab
    if (tabName === 'watchlist') renderWatchlist();
    if (tabName === 'sectors') renderSectorTab();
    if (tabName === 'insights') generateInsights();
}

// Stock detail view
async function loadStockDetail(ticker, period) {
    selectedTicker = ticker;
    // Hide all tabs, show detail tab
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-detail').classList.add('active');
    
    // Fetch stock data
    const data = await api.getStock(ticker, period);
    
    // Render hero section (name, price, sector)
    document.getElementById('detail-hero').innerHTML = `...`;
    
    // Render stats grid (market cap, P/E, EPS, etc.)
    document.getElementById('detail-stats').innerHTML = stats.map(...);
    
    // Render candlestick or line chart
    if (currentChartType === 'candle')
        renderCandlestickChart('detail-price-chart', data.historical_prices);
    else
        renderPriceChart('detail-price-chart', data.historical_prices, ticker);
    
    // Generate AI insight for this stock
    document.getElementById('detail-ai-insight').innerHTML = 
        generateStockInsight(data);
}

// Watchlist (localStorage)
function getWatchlist() { 
    return JSON.parse(localStorage.getItem('finpulse_watchlist')) || []; 
}
function toggleWatchlist(ticker) {
    let list = getWatchlist();
    if (list.includes(ticker)) list = list.filter(t => t !== ticker);
    else list.push(ticker);
    localStorage.setItem('finpulse_watchlist', JSON.stringify(list));
}

// Theme toggle
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('finpulse_theme', next);
    // Destroy and re-render all charts with new colors
    destroyAllCharts();
    renderFundChart('fund-chart', allStocks, ...);
}

// AI Insights (rule-based, no LLM)
function generateInsights() {
    // 1. Market Momentum: who's up/down the most
    const top = sorted[0], bottom = sorted[sorted.length - 1];
    
    // 2. Valuation Alert: stocks with P/E > 30
    const highPe = allStocks.filter(s => s.pe_ratio > 30);
    
    // 3. Value Opportunities: stocks with P/E < 15
    const valueStocks = allStocks.filter(s => s.pe_ratio < 15);
    
    // 4. Dividend Champions: dividend yield > 2%
    const dividendStocks = allStocks.filter(s => s.dividend_yield > 0.02);
    
    // 5. Sector Analysis: biggest sector by market cap
    // 6. Size Factor: large-cap vs small-cap performance
}

// Stock Screener (client-side filter)
function runScreener() {
    let results = allStocks.filter(s => {
        if (s.market_cap < mcapMin || s.market_cap > mcapMax) return false;
        if (s.pe_ratio < peMin || s.pe_ratio > peMax) return false;
        if (s.eps < epsMin) return false;
        if (sector && s.sector !== sector) return false;
        return true;
    });
    // Render results as clickable stock list items
}
```

### js/charts.js — Chart Rendering
```javascript
// Theme-aware color palette
function getPalette() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        blue: '#60a5fa',
        green: isLight ? '#059669' : '#34d399',
        red: isLight ? '#dc2626' : '#f87171',
        grid: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
        text: isLight ? '#6b7280' : '#7a8ba8',
        tooltipBg: isLight ? '#ffffff' : '#0f1a30',
        // ...
    };
}

// Candlestick chart (custom plugin)
function renderCandlestickChart(canvasId, data) {
    const candlePlugin = {
        id: 'candlestick',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            const xScale = scales.x;
            const yScale = scales.y;
            
            candleData.forEach((d, i) => {
                const xPos = xScale.getPixelForValue(i);
                const isUp = d.c >= d.o;
                const color = isUp ? palette.green : palette.red;
                
                // Draw upper wick
                ctx.beginPath();
                ctx.moveTo(xPos, yScale.getPixelForValue(d.h));
                ctx.lineTo(xPos, bodyTop);
                ctx.stroke();
                
                // Draw body
                ctx.fillStyle = color;
                ctx.fillRect(xPos - barWidth/2, bodyTop, barWidth, bodyHeight);
                
                // Draw lower wick
                ctx.beginPath();
                ctx.moveTo(xPos, bodyBottom);
                ctx.lineTo(xPos, yScale.getPixelForValue(d.l));
                ctx.stroke();
            });
        }
    };
    
    // Two datasets: volume bars + close price line
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [
                { label: 'Volume', yAxisID: 'volume', data: volumes },
                { label: 'Close', type: 'line', yAxisID: 'y', data: closes },
            ]
        },
        options: {
            scales: {
                y: { position: 'right' },       // Price on right
                volume: { display: false, max: maxVol * 5 },  // Volume hidden, scaled
            }
        },
        plugins: [candlePlugin],  // Custom candlestick renderer
    });
}

// Heatmap rendering
function renderHeatmap(containerId, stocks) {
    const metrics = [
        { key: 'pe_ratio', label: 'P/E' },
        { key: 'eps', label: 'EPS' },
        { key: 'dividend_yield', label: 'Div Yield' },
        { key: 'book_value', label: 'Book Val' },
    ];
    
    // Quartile-based color classification
    function getClassForMetric(values, metricKey) {
        const sorted = [...nums].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q2 = sorted[Math.floor(sorted.length * 0.5)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        
        return function(val) {
            if (val >= q3) return 'hm-excellent';  // Green
            if (val >= q2) return 'hm-good';        // Light green
            if (val >= q1) return 'hm-weak';        // Light red
            return 'hm-poor';                        // Red
        };
    }
    
    // Generate CSS grid HTML
    // grid-template-columns: 140px repeat(4, 1fr)
}
```

### js/api.js — API Client
```javascript
const api = {
    async getStocks() {
        const res = await fetch('/api/stocks');
        return res.json();  // Returns array of 20 stocks
    },
    async getStock(ticker, period) {
        const res = await fetch(`/api/stocks/${ticker}?period=${period}`);
        return res.json();  // Returns stock detail with history
    },
    async getMarketSummary() {
        const res = await fetch('/api/market-summary');
        return res.json();  // Returns gainers/losers/sectors
    }
};
```

---

## 6. DATA PIPELINE

### First Load (Cold Start)
```
Time 0s:     User visits site
Time 0-1s:   HTML/CSS/JS served from FastAPI static files
Time 1s:     Frontend calls /api/stocks and /api/market-summary simultaneously
Time 1-3s:   Backend checks SQLite → empty
Time 3-8s:   yf.download() batch fetches 5 days of price data for 20 stocks
Time 8-9s:   Stores price data in SQLite
Time 9-40s:  Loops through 20 tickers, calls yf.Ticker().info for each (~1.5s each)
Time 40-42s: Stores fundamentals in SQLite
Time 42s:    Returns JSON response to frontend
Time 42-44s: Frontend renders all charts, tables, heatmap
```

### Subsequent Loads (Warm)
```
Time 0s:     User navigates or refreshes
Time 0-1s:   Frontend calls API
Time 0-1s:   Backend reads from SQLite (instant)
Time 1s:     Returns cached data
```

### Stock Detail Load
```
User clicks "TCS" in sidebar
    → loadStockDetail("TCS.NS")
    → fetch /api/stocks/TCS.NS?period=1y
    → Backend checks: does StockPrice exist for TCS.NS?
        YES: reads from DB (fast)
        NO: fetches full year history from yf.Ticker().history(period="1y")
    → Backend checks: does Fundamental exist for TCS.NS?
        YES: reads from DB
        NO: fetches from yf.Ticker().info
    → Returns historical_prices array (up to 365 OHLCV records)
    → Frontend renders candlestick chart
```

---

## 7. ALL CHALLENGES & SOLUTIONS

### Challenge 1: MySQL Unavailable
**Problem:** Initial plan was MySQL. No MySQL installed on the machine. No package managers (winget/choco) available.

**Solution:** Switched to SQLite. Zero installation needed. SQLAlchemy works with both — just changed the connection string.

**Lesson:** Always have a fallback database strategy. SQLite is underrated for prototypes and small apps.

---

### Challenge 2: Python 3.14 Compatibility
**Problem:** pandas 2.2.3 had no pre-built wheel for Python 3.14. Installation failed.

**Solution:** Removed version pins from requirements.txt. Used latest compatible versions. Added `python-dotenv` for environment variable management.

**Lesson:** Pin major versions, not exact versions. Use `>=` constraints for flexibility.

---

### Challenge 3: TATAMOTORS.NS Returns No Data
**Problem:** Yahoo Finance API returns null for Tata Motors ticker.

**Solution:** The app gracefully handles null values — shows "--" in the UI, excludes from charts. No crash.

**Lesson:** Always handle missing data gracefully. Financial APIs are unreliable.

---

### Challenge 4: Vercel Serverless Timeout (THE BIG ONE)
**Problem:** yFinance fetching 20 stocks takes 30-60 seconds. Vercel free tier has 60s timeout. Background threads get killed when function recycles.

**Attempted Solutions:**
1. Background thread in lifespan → killed by Vercel
2. Separate startup endpoint → still times out
3. **Final solution:** Inline fetching within API requests

**Final Solution:**
- `yf.download()` batch fetch for prices (single API call, ~5s)
- Individual `yf.Ticker().info` for fundamentals (~2s each)
- Thread lock prevents duplicate fetches
- Data cached in SQLite per function instance

**Lesson:** Serverless ≠ traditional server. No persistent state. Design for stateless execution.

---

### Challenge 5: SQLite on Vercel (Ephemeral Storage)
**Problem:** Vercel's `/tmp` resets on each cold start. Database wiped.

**Solution:** Data re-fetches automatically via on-demand mechanism. As long as function stays warm, data persists.

**For production:** Would use Supabase (PostgreSQL) or PlanetScale (MySQL).

**Lesson:** Understand your deployment platform's storage model.

---

### Challenge 6: Change Percentage Always 0%
**Problem:** Only stored 1 day of price data. No previous day to compare.

**Solution:** Changed to `period="5d"` — stores 5 days of history. `change_pct = (current - previous) / previous * 100` now works.

**Lesson:** Always think about what data you need for derived calculations.

---

### Challenge 7: Heatmap/Charts Empty (No Fundamentals)
**Problem:** Removed `yf.Ticker().info` calls to speed up batch fetch. Lost P/E, EPS, market cap data.

**Solution:** Added fundamentals fetching back after batch price download. Each stock checks if fundamentals exist before fetching (skips if already cached).

**Lesson:** Don't optimize away essential data. Find the right balance between speed and completeness.

---

### Challenge 8: Theme Toggle Not Working
**Problem:** Used `body.light` class + inline `style="display:none"` on elements. Inline styles beat class selectors in CSS specificity.

**Solution:** 
- Switched to `data-theme="light"` on `<html>` element
- Removed ALL inline `style="display:none"` overrides
- Used `[data-theme="light"]` CSS selectors

**Lesson:** CSS specificity matters. `style=""` beats `.class`. Use `data-*` attributes for state.

---

### Challenge 9: Sidebar Disappears on Desktop
**Problem:** Used `sidebar.style.display = 'none'` to hide sidebar. Mobile hamburger only toggled `.open` class. Inline display:none overrode the class.

**Solution:** Removed all `style.display` manipulation. Mobile: `.open` class for slide animation. Desktop: sidebar always visible.

**Lesson:** Don't mix inline styles with class-based state management.

---

### Challenge 10: Candlestick Chart (No Library)
**Problem:** No good free candlestick library for Chart.js.

**Solution:** Built custom Chart.js plugin:
- Hooks into `afterDatasetsDraw`
- Draws candles using Canvas 2D API
- Green body + wicks for up days
- Red body + wicks for down days
- Volume bars on secondary Y-axis

**Lesson:** Chart.js plugin system is powerful. `afterDatasetsDraw` lets you draw anything on the canvas.

---

## 8. DEPLOYMENT STORY

### Local Development
```bash
python -m backend.main
# Runs on http://localhost:8000
# SQLite database at data/finpulse.db
```

### Vercel Deployment
1. Created GitHub repo, pushed code
2. Connected repo to Vercel
3. Vercel auto-detected FastAPI
4. Created `api/index.py` as serverless entry point
5. Created `vercel.json` with route configuration
6. Updated `database.py` to use `/tmp` on Vercel
7. Removed background threads (incompatible with serverless)
8. Added inline data fetching in API endpoints

### Vercel Configuration
```json
{
  "builds": [{ "src": "api/index.py", "use": "@vercel/python" }],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.py" },
    { "src": "/(.*)", "dest": "api/index.py" }
  ]
}
```

### api/index.py (Vercel Entry Point)
```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from backend.main import app
```

### Vercel Behavior
- **Cold start:** Creates function instance → runs lifespan → creates DB tables
- **First request:** Triggers yFinance fetch (~30-40s) → caches in SQLite
- **Subsequent requests:** Reads from SQLite cache (<100ms)
- **Idle timeout:** Function recycled → data lost → refetch on next request
- **Traffic:** Function stays warm as long as there's activity

---

## 9. INTERVIEW Q&A

### General

**Q: What did you build?**
A: A stock market monitoring dashboard tracking 20 NIFTY 50 Indian stocks. It shows real-time prices, historical charts, fundamentals, sector analysis, and has portfolio management features.

**Q: Why did you choose this project?**
A: It combines backend API design, database management, frontend visualization, and real-world data — all in one project. It demonstrates full-stack development with a practical use case.

**Q: What would you do differently?**
A: Three things: (1) Use a cloud database like Supabase for persistent storage across cold starts. (2) Add WebSocket for real-time price updates. (3) Add user authentication with proper accounts.

**Q: What was the hardest part?**
A: Deploying to Vercel serverless. yFinance fetching 20 stocks takes 30-40 seconds, which exceeds serverless timeouts. I had to redesign the data pipeline from background threads to inline fetching within API requests.

### Backend

**Q: Why FastAPI over Flask?**
A: FastAPI has auto-generated API docs, built-in request validation via Pydantic, async support, and better performance. Flask is more manual and lacks these features.

**Q: How does your database work?**
A: SQLite with SQLAlchemy ORM. Three tables: companies (ticker, name, sector), stock_prices (OHLCV per day), fundamentals (P/E, EPS, market cap per day). Data is fetched from Yahoo Finance and cached in SQLite.

**Q: How do you handle concurrent requests?**
A: Thread lock (`threading.Lock`) prevents two requests from triggering data fetches simultaneously. The first request fetches, subsequent requests wait or read from cache.

**Q: What is yFinance?**
A: A Python library that wraps the Yahoo Finance API. Provides stock prices, fundamentals, and historical data. Free, no API key needed. Supports Indian stocks via `.NS` suffix (NSE).

### Frontend

**Q: Why no React?**
A: The project is a single-page dashboard with 5 views. Vanilla JS was sufficient, faster to develop, simpler to deploy (no build step), and gave full control over Chart.js plugins.

**Q: How does the theme system work?**
A: CSS custom properties in `:root` for dark mode, overridden in `[data-theme='light']`. A button toggles the `data-theme` attribute on `<html>`. All colors reference CSS variables, so the entire UI re-themes instantly. Chart.js charts re-render with new colors.

**Q: How does the candlestick chart work?**
A: Custom Chart.js plugin using `afterDatasetsDraw` hook. For each data point: draws upper wick (high to body top), body (filled rectangle), lower wick (body bottom to low). Green = close >= open, Red = close < open. Volume rendered as bar dataset on secondary Y-axis.

**Q: How does the heatmap work?**
A: CSS grid with 5 columns (stock name + 4 metrics). Each cell gets a class based on quartile position: `hm-excellent` (top 25%), `hm-good` (25-50%), `hm-weak` (50-75%), `hm-poor` (bottom 25%). Colors adapt to theme.

### Deployment

**Q: Why Vercel?**
A: Free tier, easy GitHub integration, auto-deploys on push, supports Python serverless functions. Good for demos and prototypes.

**Q: What are the limitations of your deployment?**
A: (1) Database resets on cold starts — data re-fetches automatically but takes 30-40s. (2) No persistent storage. (3) Free tier has execution time limits. For production, would use a cloud database and dedicated server.

**Q: How would you scale this?**
A: (1) Cloud database (Supabase/PlanetScale) for persistent storage. (2) Redis cache for frequently accessed data. (3) WebSocket for real-time updates. (4) Background job queue for data fetching. (5) CDN for static assets.

### Data

**Q: How do you get stock data?**
A: Yahoo Finance via yFinance Python library. Batch `yf.download()` for prices (fast, one API call). Individual `yf.Ticker().info` for fundamentals (slower, one call per stock).

**Q: What if Yahoo Finance is down?**
A: The app gracefully handles errors — shows "--" for missing data, doesn't crash. Each API call is wrapped in try/except. SQLite cache provides fallback if available.

**Q: What metrics do you track?**
A: Price data: Open, High, Low, Close, Volume. Fundamentals: Market Cap, P/E Ratio, EPS, Dividend Yield, Book Value. Calculated: Change %, Sector breakdown, Top gainers/losers.

---

## 10. QUICK REFERENCE

### Key Files
| File | What It Does |
|------|-------------|
| `backend/main.py` | FastAPI app, startup, routing |
| `backend/routes/stocks.py` | Stock endpoints + yFinance fetching |
| `backend/routes/market.py` | Market summary endpoint |
| `backend/services/data_fetcher.py` | yFinance wrapper |
| `frontend/js/app.js` | All DOM logic, tabs, watchlist |
| `frontend/js/charts.js` | All chart rendering |
| `frontend/css/style.css` | Themes, layout, responsive |

### Key Numbers
- 20 stocks tracked
- 5 days of price history cached
- ~30-40s first load (cold start)
- <100ms cached reads
- ~2,400 lines of code
- 3 API endpoints
- 5 frontend tabs

### Key Concepts
- **Serverless:** No persistent state, function recycled after idle
- **SQLite:** Embedded, zero-config, single-file database
- **yFinance:** Free Yahoo Finance Python wrapper
- **Chart.js Plugin:** Custom candlestick renderer via `afterDatasetsDraw`
- **CSS Variables:** Theme system via `data-theme` attribute
- **On-demand fetching:** Fetch data when needed, cache in DB
- **Thread lock:** Prevent duplicate concurrent fetches
- **Quartile classification:** Heatmap color coding (top/bottom 25%)

---

*Read this cover to cover before your interview. You should be able to answer any question about this project.*
