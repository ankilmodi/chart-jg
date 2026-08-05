"""
app/scheduler/jobs.py
═══════════════════════════════════════════════════════════════════════════════
Session-aware background scheduler.

Jobs
────
  • live_refresh    — runs every 8 s during LIVE hours, pre-warms data cache
  • eod_snapshot    — runs once at 15:30 IST to persist today's final data
  • pre_open_check  — runs every 60 s during PRE_OPEN to prime prev-close data
  • session_watcher — runs every 60 s to start/stop correct jobs dynamically

The scheduler is started from app/main.py lifespan.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime

import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron      import CronTrigger
from apscheduler.triggers.interval  import IntervalTrigger

logger    = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")
IST       = pytz.timezone("Asia/Kolkata")

# Top F&O / NIFTY 50 tickers pre-warmed each cycle (keeps cache hot)
_WARMUP_TICKERS = [
    "^NSEI", "^NSEBANK", "^INDIAVIX",
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "KOTAKBANK.NS", "SBIN.NS", "AXISBANK.NS", "BHARTIARTL.NS", "LT.NS",
    "BAJFINANCE.NS", "BAJAJFINSV.NS", "MARUTI.NS", "TATAMOTORS.NS",
    "SUNPHARMA.NS", "WIPRO.NS", "HCLTECH.NS", "TATASTEEL.NS",
    "ADANIPORTS.NS", "TITAN.NS", "NESTLEIND.NS", "ASIANPAINT.NS",
]


# ── Job: Live refresh (during market hours) ───────────────────────────────────

async def _live_refresh():
    """Pre-warm live data cache for top tickers every ~8 seconds."""
    try:
        from app.services.market_data_engine import market_data_engine as engine
        if not engine.isMarketOpen():
            return  # guard: don't poll outside market hours

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: engine.getBatchData(_WARMUP_TICKERS, period="2d"),
        )
        logger.debug("live_refresh: cache pre-warmed for %d tickers", len(_WARMUP_TICKERS))
    except Exception as exc:
        logger.warning("live_refresh error: %s", exc)


# ── Job: EOD snapshot (at 15:30 IST) ─────────────────────────────────────────

async def _eod_snapshot():
    """Persist today's closing data at market close (15:30 IST)."""
    try:
        from app.services.market_data_engine import market_data_engine as engine
        count = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: engine.storeEodSnapshot(_WARMUP_TICKERS),
        )
        logger.info("eod_snapshot: stored %d tickers at market close", count)
    except Exception as exc:
        logger.error("eod_snapshot error: %s", exc)


# ── Job: Pre-open data prime (before 09:15 IST) ───────────────────────────────

async def _pre_open_prime():
    """Fetch previous-day close during pre-open so first live load is instant."""
    try:
        from app.services.market_data_engine import market_data_engine as engine
        from app.services.market_data_engine import SessionType
        if engine.getSessionType() != SessionType.PRE_OPEN:
            return

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: engine.getBatchData(_WARMUP_TICKERS[:10], period="5d"),
        )
        logger.debug("pre_open_prime: previous-close data cached")
    except Exception as exc:
        logger.warning("pre_open_prime error: %s", exc)


# ── Job: Legacy market data refresh ──────────────────────────────────────────

async def _legacy_refresh():
    """Keep old market data / indicator cache warm for existing endpoints."""
    try:
        from app.services.market_data import (
            clear_cache, get_market_snapshot, get_ohlcv, get_daily_ohlcv,
        )
        from app.services.indicator_service import compute_indicators
        from app.services.market_data_engine import market_data_engine as engine

        if not engine.isMarketOpen():
            return  # only during live hours

        clear_cache()
        snapshot = get_market_snapshot()
        get_ohlcv(period="5d", interval="5m")
        get_daily_ohlcv()
        if snapshot:
            compute_indicators(price=snapshot["price"])
        logger.debug("legacy_refresh: done | price=%s", snapshot["price"] if snapshot else "N/A")
    except Exception as exc:
        logger.warning("legacy_refresh error: %s", exc)


# ── Scheduler lifecycle ───────────────────────────────────────────────────────

def start_scheduler() -> None:
    """
    Start all background jobs.

    Job schedule:
      live_refresh   → every 8 s  (runs only when market is open)
      eod_snapshot   → cron 15:30 IST Mon–Fri
      pre_open_prime → every 60 s (runs only during pre-open 09:00–09:15)
      legacy_refresh → every 60 s (runs only during market hours)
    """
    if scheduler.running:
        return

    # Live refresh – every 8 seconds (guarded inside the job)
    scheduler.add_job(
        _live_refresh,
        trigger      = IntervalTrigger(seconds=8),
        id           = "live_refresh",
        replace_existing = True,
        max_instances    = 1,
    )

    # EOD snapshot – Mon–Fri at exactly 15:30 IST
    scheduler.add_job(
        _eod_snapshot,
        trigger      = CronTrigger(
            day_of_week = "mon-fri",
            hour        = 15,
            minute      = 30,
            second      = 0,
            timezone    = IST,
        ),
        id           = "eod_snapshot",
        replace_existing = True,
        max_instances    = 1,
    )

    # Pre-open prime – every 60 s (guarded inside)
    scheduler.add_job(
        _pre_open_prime,
        trigger      = IntervalTrigger(seconds=60),
        id           = "pre_open_prime",
        replace_existing = True,
        max_instances    = 1,
    )

    # Legacy refresh – every 60 s (guarded inside)
    scheduler.add_job(
        _legacy_refresh,
        trigger      = IntervalTrigger(seconds=60),
        id           = "legacy_refresh",
        replace_existing = True,
        max_instances    = 1,
    )

    scheduler.start()
    logger.info(
        "Scheduler started — live_refresh:8s | eod_snapshot:15:30 IST | legacy:60s"
    )


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
