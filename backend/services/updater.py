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

    for ticker in TRACKED_STOCKS:
        logger.info(f"Fetching historical data for {ticker}...")
        fetch_and_store_historical_data(db, ticker, period="1y")

    for ticker in TRACKED_STOCKS:
        logger.info(f"Fetching fundamentals for {ticker}...")
        fetch_and_store_fundamentals(db, ticker)

    logger.info("Initial data load complete.")


def refresh_fundamentals(db: Session):
    logger.info("Refreshing fundamentals...")
    ensure_companies_exist(db)
    for ticker in TRACKED_STOCKS:
        fetch_and_store_fundamentals(db, ticker)
    logger.info("Fundamentals refresh complete.")
