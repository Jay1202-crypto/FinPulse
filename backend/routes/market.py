import logging
import threading
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Company, StockPrice, Fundamental, MarketSummaryResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/market-summary", tags=["market"])

_fetch_lock = threading.Lock()


def ensure_data(db: Session):
    has_data = db.query(StockPrice).first()
    if not has_data:
        if _fetch_lock.acquire(blocking=False):
            try:
                from backend.routes.stocks import _fetch_live_overview
                _fetch_live_overview(db)
            finally:
                _fetch_lock.release()


@router.get("", response_model=MarketSummaryResponse)
def market_summary(db: Session = Depends(get_db)):
    ensure_data(db)

    companies = db.query(Company).all()
    total_market_cap = 0.0
    stock_data = []

    for c in companies:
        latest_price = (
            db.query(StockPrice)
            .filter(StockPrice.ticker == c.ticker)
            .order_by(StockPrice.trade_date.desc())
            .first()
        )
        latest_fund = (
            db.query(Fundamental)
            .filter(Fundamental.ticker == c.ticker)
            .order_by(Fundamental.data_date.desc())
            .first()
        )

        mcap = float(latest_fund.market_cap) if latest_fund and latest_fund.market_cap else 0
        total_market_cap += mcap

        prev_price = (
            db.query(StockPrice)
            .filter(StockPrice.ticker == c.ticker)
            .order_by(StockPrice.trade_date.desc())
            .offset(1)
            .first()
        )

        current = float(latest_price.close) if latest_price and latest_price.close else None
        previous = float(prev_price.close) if prev_price and prev_price.close else None
        change_pct = ((current - previous) / previous * 100) if current and previous and previous != 0 else 0

        stock_data.append({
            "ticker": c.ticker, "name": c.name, "sector": c.sector,
            "close": current, "change_pct": round(change_pct, 2), "market_cap": mcap,
        })

    stock_data.sort(key=lambda x: x["change_pct"], reverse=True)
    top_gainers = stock_data[:5]
    top_losers = stock_data[-5:][::-1]

    sector_map = {}
    for s in stock_data:
        sector = s["sector"] or "Unknown"
        if sector not in sector_map:
            sector_map[sector] = {"sector": sector, "market_cap": 0, "count": 0}
        sector_map[sector]["market_cap"] += s["market_cap"]
        sector_map[sector]["count"] += 1

    sector_breakdown = sorted(sector_map.values(), key=lambda x: x["market_cap"], reverse=True)

    return MarketSummaryResponse(
        total_market_cap=round(total_market_cap, 2),
        stock_count=len(companies),
        top_gainers=top_gainers, top_losers=top_losers,
        sector_breakdown=sector_breakdown,
    )
