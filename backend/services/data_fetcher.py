import yfinance as yf
import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session
from backend.models import Company, StockPrice, Fundamental

logger = logging.getLogger(__name__)

TRACKED_STOCKS = {
    "RELIANCE.NS": ("Reliance Industries", "Oil & Gas"),
    "TCS.NS": ("Tata Consultancy Services", "IT"),
    "HDFCBANK.NS": ("HDFC Bank", "Banking"),
    "INFY.NS": ("Infosys", "IT"),
    "ICICIBANK.NS": ("ICICI Bank", "Banking"),
    "HINDUNILVR.NS": ("Hindustan Unilever", "FMCG"),
    "ITC.NS": ("ITC Limited", "FMCG"),
    "SBIN.NS": ("State Bank of India", "Banking"),
    "BHARTIARTL.NS": ("Bharti Airtel", "Telecom"),
    "KOTAKBANK.NS": ("Kotak Mahindra Bank", "Banking"),
    "LT.NS": ("Larsen & Toubro", "Infrastructure"),
    "AXISBANK.NS": ("Axis Bank", "Banking"),
    "ASIANPAINT.NS": ("Asian Paints", "Consumer Goods"),
    "MARUTI.NS": ("Maruti Suzuki", "Automobile"),
    "HCLTECH.NS": ("HCL Technologies", "IT"),
    "SUNPHARMA.NS": ("Sun Pharma", "Pharma"),
    "TATAMOTORS.NS": ("Tata Motors", "Automobile"),
    "WIPRO.NS": ("Wipro", "IT"),
    "ULTRACEMCO.NS": ("UltraTech Cement", "Cement"),
    "NTPC.NS": ("NTPC Limited", "Power"),
}


def ensure_companies_exist(db: Session):
    for ticker, (name, sector) in TRACKED_STOCKS.items():
        existing = db.query(Company).filter(Company.ticker == ticker).first()
        if not existing:
            db.add(Company(ticker=ticker, name=name, sector=sector, exchange="NSE"))
    db.commit()


def fetch_and_store_historical_data(db: Session, ticker: str, period: str = "1y"):
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)
        if hist.empty:
            logger.warning(f"No historical data for {ticker}")
            return

        count = 0
        for row_date, row in hist.iterrows():
            trade_date = row_date.date()
            existing = (
                db.query(StockPrice)
                .filter(StockPrice.ticker == ticker, StockPrice.trade_date == trade_date)
                .first()
            )
            if existing:
                existing.open = round(row["Open"], 2)
                existing.high = round(row["High"], 2)
                existing.low = round(row["Low"], 2)
                existing.close = round(row["Close"], 2)
                existing.volume = int(row["Volume"])
            else:
                db.add(
                    StockPrice(
                        ticker=ticker,
                        trade_date=trade_date,
                        open=round(row["Open"], 2),
                        high=round(row["High"], 2),
                        low=round(row["Low"], 2),
                        close=round(row["Close"], 2),
                        volume=int(row["Volume"]),
                    )
                )
                count += 1
        db.commit()
        logger.info(f"Stored {count} new price rows for {ticker}")
    except Exception as e:
        logger.error(f"Error fetching historical data for {ticker}: {e}")
        db.rollback()


def fetch_and_store_fundamentals(db: Session, ticker: str):
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        today = date.today()

        market_cap = info.get("marketCap")
        pe_ratio = info.get("trailingPE") or info.get("forwardPE")
        eps = info.get("trailingEps")
        div_yield = info.get("dividendYield")
        book_val = info.get("bookValue")

        existing = (
            db.query(Fundamental)
            .filter(Fundamental.ticker == ticker, Fundamental.data_date == today)
            .first()
        )
        if existing:
            existing.market_cap = market_cap
            existing.pe_ratio = pe_ratio
            existing.eps = eps
            existing.dividend_yield = div_yield
            existing.book_value = book_val
        else:
            db.add(
                Fundamental(
                    ticker=ticker,
                    data_date=today,
                    market_cap=market_cap,
                    pe_ratio=pe_ratio,
                    eps=eps,
                    dividend_yield=div_yield,
                    book_value=book_val,
                )
            )
        db.commit()
        logger.info(f"Stored fundamentals for {ticker}")
    except Exception as e:
        logger.error(f"Error fetching fundamentals for {ticker}: {e}")
        db.rollback()


def fetch_stock_price(ticker: str) -> dict | None:
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="5d")
        if hist.empty:
            return None
        latest = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else latest
        return {
            "close": round(latest["Close"], 2),
            "open": round(latest["Open"], 2),
            "high": round(latest["High"], 2),
            "low": round(latest["Low"], 2),
            "volume": int(latest["Volume"]),
            "prev_close": round(prev["Close"], 2),
        }
    except Exception as e:
        logger.error(f"Error fetching live price for {ticker}: {e}")
        return None
