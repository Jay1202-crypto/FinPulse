import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.database import engine, SessionLocal, Base
from backend.routes.stocks import router as stocks_router
from backend.routes.market import router as market_router
from backend.services.updater import initial_data_load, fetch_all_stocks

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

_data_loaded = False


def _background_fetch():
    global _data_loaded
    logger.info("Background: starting full data fetch...")
    db = SessionLocal()
    try:
        fetch_all_stocks(db)
    finally:
        db.close()
    _data_loaded = True
    logger.info("Background: full data fetch complete.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _data_loaded
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")

    db = SessionLocal()
    try:
        initial_data_load(db)
    finally:
        db.close()

    import threading
    t = threading.Thread(target=_background_fetch, daemon=True)
    t.start()

    yield


app = FastAPI(title="FinPulse", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks_router)
app.include_router(market_router)

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
def serve_dashboard():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FinPulse", "data_loaded": _data_loaded}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
