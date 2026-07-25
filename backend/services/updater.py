import logging
from sqlalchemy.orm import Session
from backend.models import Company
from backend.services.data_fetcher import (
    TRACKED_STOCKS,
    ensure_companies_exist,
    fetch_and_store_historical_data,
    fetch_and_store_fundamentals,
)

logger = logging.getLogger(__name__)


def initial_data_load(db: Session):
    logger.info("Starting initial data load...")
    ensure_companies_exist(db)
    logger.info("Initial data load complete.")


def fetch_stock_if_missing(db: Session, ticker: str):
    from backend.models import StockPrice, Fundamental
    from sqlalchemy import desc

    has_prices = db.query(StockPrice).filter(StockPrice.ticker == ticker).first()
    if not has_prices:
        logger.info(f"Fetching historical data for {ticker} (on-demand)...")
        fetch_and_store_historical_data(db, ticker, period="1y")

    has_fund = db.query(Fundamental).filter(Fundamental.ticker == ticker).first()
    if not has_fund:
        logger.info(f"Fetching fundamentals for {ticker} (on-demand)...")
        fetch_and_store_fundamentals(db, ticker)


def fetch_all_stocks(db: Session):
    ensure_companies_exist(db)
    for ticker in TRACKED_STOCKS:
        fetch_stock_if_missing(db, ticker)


def refresh_fundamentals(db: Session):
    logger.info("Refreshing fundamentals...")
    ensure_companies_exist(db)
    for ticker in TRACKED_STOCKS:
        fetch_and_store_fundamentals(db, ticker)
    logger.info("Fundamentals refresh complete.")
