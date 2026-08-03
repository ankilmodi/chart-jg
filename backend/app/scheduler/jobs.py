"""
Background scheduler: pre-fetches and refreshes cache every 60 seconds.
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.services.market_data import clear_cache, get_market_snapshot, get_ohlcv, get_daily_ohlcv
from app.services.indicator_service import compute_indicators

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _refresh_data():
    """Pre-warm cache by fetching fresh data."""
    try:
        clear_cache()
        snapshot = get_market_snapshot()
        get_ohlcv(period="5d", interval="5m")
        get_daily_ohlcv()
        if snapshot:
            compute_indicators(price=snapshot["price"])
        logger.info("Cache refreshed | price=%s", snapshot["price"] if snapshot else "N/A")
    except Exception as e:
        logger.error("Scheduler refresh error: %s", e)


def start_scheduler(interval_seconds: int = 60):
    """Start the background refresh scheduler."""
    if not scheduler.running:
        scheduler.add_job(
            _refresh_data,
            trigger=IntervalTrigger(seconds=interval_seconds),
            id="refresh_data",
            replace_existing=True,
            max_instances=1,
        )
        scheduler.start()
        logger.info("Scheduler started – refresh every %ds", interval_seconds)


def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
