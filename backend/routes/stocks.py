import yfinance as yf
import logging
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database import get_db
from backend.models import Company, StockPrice, Fundamental, StockResponse, StockDetailResponse, PricePoint
from backend.services.data_fetcher import TRACKED_STOCKS, ensure_companies_exist

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stocks", tags=["stocks"])


def _fetch_live_overview(db: Session):
    ensure_companies_exist(db)
    tickers = list(TRACKED_STOCKS.keys())
    try:
        batch = yf.download(tickers, period="5d", group_by="ticker", progress=False, threads=True)
    except Exception as e:
        logger.error(f"Batch download failed: {e}")
        return

    today = date.today()
    for ticker in tickers:
        try:
            if len(tickers) > 1:
                df = batch[ticker] if ticker in batch.columns.get_level_values(0) else None
            else:
                df = batch
            if df is None or df.empty:
                continue
            df = df.dropna(how="all")
            if df.empty:
                continue
            for row_date, row in df.iterrows():
                trade_date = row_date.date()
                existing = db.query(StockPrice).filter(
                    StockPrice.ticker == ticker, StockPrice.trade_date == trade_date
                ).first()
                if existing:
                    existing.open = round(float(row["Open"]), 2)
                    existing.high = round(float(row["High"]), 2)
                    existing.low = round(float(row["Low"]), 2)
                    existing.close = round(float(row["Close"]), 2)
                    existing.volume = int(row["Volume"])
                else:
                    db.add(StockPrice(
                        ticker=ticker, trade_date=trade_date,
                        open=round(float(row["Open"]), 2), high=round(float(row["High"]), 2),
                        low=round(float(row["Low"]), 2), close=round(float(row["Close"]), 2),
                        volume=int(row["Volume"]),
                    ))
            db.commit()
        except Exception as e:
            logger.error(f"Error processing {ticker}: {e}")
            db.rollback()

    for ticker in tickers:
        try:
            existing_fund = db.query(Fundamental).filter(
                Fundamental.ticker == ticker, Fundamental.data_date == today
            ).first()
            if existing_fund:
                continue
            info = yf.Ticker(ticker).info
            db.add(Fundamental(
                ticker=ticker, data_date=today,
                market_cap=info.get("marketCap"),
                pe_ratio=info.get("trailingPE") or info.get("forwardPE"),
                eps=info.get("trailingEps"),
                dividend_yield=info.get("dividendYield"),
                book_value=info.get("bookValue"),
            ))
            db.commit()
        except Exception as e:
            logger.error(f"Error fetching fundamentals for {ticker}: {e}")
            db.rollback()


@router.get("", response_model=list[StockResponse])
def list_stocks(db: Session = Depends(get_db)):
    companies = db.query(Company).all()
    if not companies:
        ensure_companies_exist(db)
        companies = db.query(Company).all()

    has_data = db.query(StockPrice).first()
    if not has_data:
        _fetch_live_overview(db)

    results = []
    for c in companies:
        latest_price = (
            db.query(StockPrice)
            .filter(StockPrice.ticker == c.ticker)
            .order_by(desc(StockPrice.trade_date))
            .first()
        )
        latest_fund = (
            db.query(Fundamental)
            .filter(Fundamental.ticker == c.ticker)
            .order_by(desc(Fundamental.data_date))
            .first()
        )
        results.append(
            StockResponse(
                ticker=c.ticker, name=c.name, sector=c.sector, exchange=c.exchange,
                latest_close=float(latest_price.close) if latest_price and latest_price.close else None,
                market_cap=float(latest_fund.market_cap) if latest_fund and latest_fund.market_cap else None,
                pe_ratio=float(latest_fund.pe_ratio) if latest_fund and latest_fund.pe_ratio else None,
                eps=float(latest_fund.eps) if latest_fund and latest_fund.eps else None,
                dividend_yield=float(latest_fund.dividend_yield) if latest_fund and latest_fund.dividend_yield else None,
                book_value=float(latest_fund.book_value) if latest_fund and latest_fund.book_value else None,
            )
        )
    return results


@router.get("/{ticker}", response_model=StockDetailResponse)
def get_stock(
    ticker: str,
    period: str = Query("1y", pattern="^(1mo|3mo|6mo|1y|2y|5y)$"),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    today = date.today()
    has_prices = db.query(StockPrice).filter(StockPrice.ticker == ticker).first()
    if not has_prices:
        try:
            stock_obj = yf.Ticker(ticker)
            hist = stock_obj.history(period=period)
            if not hist.empty:
                for row_date, row in hist.iterrows():
                    db.add(StockPrice(
                        ticker=ticker, trade_date=row_date.date(),
                        open=round(row["Open"], 2), high=round(row["High"], 2),
                        low=round(row["Low"], 2), close=round(row["Close"], 2),
                        volume=int(row["Volume"]),
                    ))
                db.commit()
        except Exception as e:
            logger.error(f"Error fetching history for {ticker}: {e}")
            db.rollback()

    has_fund = db.query(Fundamental).filter(Fundamental.ticker == ticker).first()
    if not has_fund:
        try:
            info = yf.Ticker(ticker).info
            db.add(Fundamental(
                ticker=ticker, data_date=today,
                market_cap=info.get("marketCap"),
                pe_ratio=info.get("trailingPE") or info.get("forwardPE"),
                eps=info.get("trailingEps"),
                dividend_yield=info.get("dividendYield"),
                book_value=info.get("bookValue"),
            ))
            db.commit()
        except Exception as e:
            logger.error(f"Error fetching fundamentals for {ticker}: {e}")
            db.rollback()

    latest_price = (
        db.query(StockPrice).filter(StockPrice.ticker == ticker)
        .order_by(desc(StockPrice.trade_date)).first()
    )
    latest_fund = (
        db.query(Fundamental).filter(Fundamental.ticker == ticker)
        .order_by(desc(Fundamental.data_date)).first()
    )

    period_days = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "5y": 1825}
    since = date.today() - timedelta(days=period_days.get(period, 365))
    prices = (
        db.query(StockPrice)
        .filter(StockPrice.ticker == ticker, StockPrice.trade_date >= since)
        .order_by(StockPrice.trade_date).all()
    )

    historical = [
        PricePoint(
            date=str(p.trade_date),
            open=float(p.open) if p.open else None,
            high=float(p.high) if p.high else None,
            low=float(p.low) if p.low else None,
            close=float(p.close) if p.close else None,
            volume=p.volume,
        ).model_dump()
        for p in prices
    ]

    return StockDetailResponse(
        ticker=company.ticker, name=company.name, sector=company.sector, exchange=company.exchange,
        latest_close=float(latest_price.close) if latest_price and latest_price.close else None,
        market_cap=float(latest_fund.market_cap) if latest_fund and latest_fund.market_cap else None,
        pe_ratio=float(latest_fund.pe_ratio) if latest_fund and latest_fund.pe_ratio else None,
        eps=float(latest_fund.eps) if latest_fund and latest_fund.eps else None,
        dividend_yield=float(latest_fund.dividend_yield) if latest_fund and latest_fund.dividend_yield else None,
        book_value=float(latest_fund.book_value) if latest_fund and latest_fund.book_value else None,
        historical_prices=historical,
    )
