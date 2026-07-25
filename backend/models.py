from datetime import date, datetime
from sqlalchemy import Column, String, Date, Integer, Float, DateTime
from pydantic import BaseModel
from typing import Optional, List
from backend.database import Base


class Company(Base):
    __tablename__ = "companies"

    ticker = Column(String(20), primary_key=True)
    name = Column(String(200), nullable=False)
    sector = Column(String(100))
    exchange = Column(String(20), default="NSE")
    created_at = Column(DateTime, default=datetime.utcnow)


class StockPrice(Base):
    __tablename__ = "stock_prices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), nullable=False, index=True)
    trade_date = Column(Date, nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)


class Fundamental(Base):
    __tablename__ = "fundamentals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), nullable=False, index=True)
    data_date = Column(Date, nullable=False)
    market_cap = Column(Float)
    pe_ratio = Column(Float)
    eps = Column(Float)
    dividend_yield = Column(Float)
    book_value = Column(Float)


class StockResponse(BaseModel):
    ticker: str
    name: str
    sector: Optional[str] = None
    exchange: str = "NSE"
    latest_close: Optional[float] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None
    book_value: Optional[float] = None


class StockDetailResponse(StockResponse):
    historical_prices: Optional[List[dict]] = None


class MarketSummaryResponse(BaseModel):
    total_market_cap: Optional[float] = None
    stock_count: int = 0
    top_gainers: List[dict] = []
    top_losers: List[dict] = []
    sector_breakdown: List[dict] = []


class PricePoint(BaseModel):
    date: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[int] = None
