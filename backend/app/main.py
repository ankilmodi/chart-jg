"""
Nifty Future Analyzer – FastAPI Application Entry Point
"""
import logging
import os
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.scanner.routes import router as scanner_router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# Suppress noisy yfinance download errors – our code handles them gracefully
logging.getLogger("yfinance").setLevel(logging.CRITICAL)
logging.getLogger("peewee").setLevel(logging.WARNING)
# Suppress urllib3 connection pool warnings (caused by yfinance batch downloads)
logging.getLogger("urllib3.connectionpool").setLevel(logging.ERROR)

_raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:5174"
).split(",")

ALLOWED_ORIGINS = [o.strip() for o in _raw_origins if o.strip()]


# ---------------------------------------------------------------------------
# Background warmup – runs scan once at startup so first API call is instant
# ---------------------------------------------------------------------------
async def _warmup():
    """Pre-warm the scan cache in background after server starts."""
    await asyncio.sleep(2)   # let server finish startup first
    try:
        logger.info("Warming up scan cache in background…")
        from app.scanner.scanner import run_full_scan
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_full_scan)
        logger.info("Scan cache warm-up complete.")
    except Exception as e:
        logger.warning("Warmup scan failed (non-critical): %s", e)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Nifty Future Analyzer API…")
    # Start background warmup – doesn't block server startup
    asyncio.create_task(_warmup())
    yield
    logger.info("Shutting down…")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Nifty Future Analyzer API",
    description=(
        "AI-Powered NSE F&O Stock Screener with 100-point Buy Score engine. "
        "EMA, RSI, MACD, ADX, Supertrend, VWAP, Bollinger Bands, OI Analysis."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(router,         prefix="/api")
app.include_router(scanner_router, prefix="/api")


# ---------------------------------------------------------------------------
# Global error handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------
@app.get("/", tags=["root"])
async def root():
    return {
        "name": "Nifty Future Analyzer API v2.0",
        "docs": "/docs",
        "endpoints": [
            "/api/future-stocks",
            "/api/heatmap",
            "/api/top-buy",
            "/api/top-buyers",
            "/api/top-sellers",
            "/api/swing-buy",
            "/api/weekly-buy",
            "/api/monthly-buy",
            "/api/breakout",
            "/api/momentum",
            "/api/long-build-up",
            "/api/short-covering",
            "/api/volume-shockers",
            "/api/volume-best",
            "/api/ema-screener",
            "/api/oi-analysis",
            "/api/stock/{symbol}",
            "/api/market-overview",
            "/api/scanner",
            "/api/watchlist",
            "/api/formula",
            "/api/notifications",
            "/api/export/csv",
        ],
    }
