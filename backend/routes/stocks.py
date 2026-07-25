from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database import get_db
from backend.models import Company, StockPrice, Fundamental, StockResponse, StockDetailResponse, PricePoint

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("", response_model=list[StockResponse])
def list_stocks(db: Session = Depends(get_db)):
    companies = db.query(Company).all()
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
                ticker=c.ticker,
                name=c.name,
                sector=c.sector,
                exchange=c.exchange,
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

    latest_price = (
        db.query(StockPrice)
        .filter(StockPrice.ticker == ticker)
        .order_by(desc(StockPrice.trade_date))
        .first()
    )
    latest_fund = (
        db.query(Fundamental)
        .filter(Fundamental.ticker == ticker)
        .order_by(desc(Fundamental.data_date))
        .first()
    )

    period_days = {
        "1mo": 30, "3mo": 90, "6mo": 180,
        "1y": 365, "2y": 730, "5y": 1825,
    }
    since = date.today() - timedelta(days=period_days.get(period, 365))
    prices = (
        db.query(StockPrice)
        .filter(StockPrice.ticker == ticker, StockPrice.trade_date >= since)
        .order_by(StockPrice.trade_date)
        .all()
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
        ticker=company.ticker,
        name=company.name,
        sector=company.sector,
        exchange=company.exchange,
        latest_close=float(latest_price.close) if latest_price and latest_price.close else None,
        market_cap=float(latest_fund.market_cap) if latest_fund and latest_fund.market_cap else None,
        pe_ratio=float(latest_fund.pe_ratio) if latest_fund and latest_fund.pe_ratio else None,
        eps=float(latest_fund.eps) if latest_fund and latest_fund.eps else None,
        dividend_yield=float(latest_fund.dividend_yield) if latest_fund and latest_fund.dividend_yield else None,
        book_value=float(latest_fund.book_value) if latest_fund and latest_fund.book_value else None,
        historical_prices=historical,
    )
