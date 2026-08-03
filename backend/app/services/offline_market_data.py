"""
app/services/offline_market_data.py
─────────────────────────────────────
OfflineMarketDataService — serves locally cached / End-of-Day data
when the market is closed or when live API calls fail.

Responsibilities
  - Persist latest API response to an in-memory store (survives restarts
    if combined with a file-backed cache)
  - Store EOD snapshot after market close
  - Return cached data with metadata (cached_at, data_source="cached"|"offline")
  - Log every fallback event at WARNING level

Design: simple JSON-serialisable in-memory dict; can be extended to use
        a real DB or Redis without touching callers.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Path where EOD cache is persisted between restarts
_CACHE_DIR  = os.path.join(os.path.dirname(__file__), ".cache")
_EOD_FILE   = os.path.join(_CACHE_DIR, "eod_cache.json")
_LIVE_FILE  = os.path.join(_CACHE_DIR, "live_cache.json")


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _ensure_cache_dir() -> None:
    os.makedirs(_CACHE_DIR, exist_ok=True)


# ── Service ───────────────────────────────────────────────────────────────────

class OfflineMarketDataService:
    """
    Serves cached / offline market data when live API is unavailable.

    Workflow:
        1.  LiveMarketDataService calls store_live_response(key, data) after
            each successful fetch during market hours.
        2.  At 15:30 IST the scheduler calls store_eod_snapshot() to persist
            the final day's data as EOD.
        3.  When market is closed, callers use get_cached(key) / get_eod(key).
    """

    def __init__(self) -> None:
        self._live_store:  Dict[str, Any] = {}   # key → latest live payload
        self._eod_store:   Dict[str, Any] = {}   # key → EOD snapshot
        self._meta:        Dict[str, str] = {}   # key → ISO timestamp of last update
        self._load_from_disk()
        logger.info("OfflineMarketDataService initialised | %d keys loaded", len(self._live_store))

    # ── Write path ────────────────────────────────────────────────────────────

    def store_live_response(self, key: str, data: Any) -> None:
        """
        Persist the latest live API response.  Called by live fetch on success.

        Args:
            key:  cache key (e.g. "market_overview", "stock_RELIANCE.NS")
            data: JSON-serialisable response dict / list
        """
        self._live_store[key] = data
        self._meta[key]       = _utc_now()
        self._persist_live()
        logger.debug("OfflineMarketDataService stored: %s", key)

    def store_eod_snapshot(self, key: str, data: Any) -> None:
        """
        Persist an End-of-Day snapshot (called at/after 15:30 IST).

        Args:
            key:  cache key (same namespace as store_live_response)
            data: JSON-serialisable EOD data dict
        """
        self._eod_store[key] = {
            "data":       data,
            "cached_at":  _utc_now(),
            "data_source": "offline",
        }
        self._persist_eod()
        logger.info("OfflineMarketDataService EOD snapshot stored: %s", key)

    # ── Read path ─────────────────────────────────────────────────────────────

    def get_cached(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Return the most recent live-cached payload, with metadata.
        Falls back to EOD if live cache is empty for the key.

        Returns:
            { "data": ..., "cached_at": "...", "data_source": "cached" | "offline" }
            or None if nothing is cached.
        """
        if key in self._live_store:
            return {
                "data":        self._live_store[key],
                "cached_at":   self._meta.get(key, "unknown"),
                "data_source": "cached",
            }
        return self.get_eod(key)

    def get_eod(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Return EOD snapshot for key, or None if not available.
        """
        entry = self._eod_store.get(key)
        if entry:
            logger.debug("OfflineMarketDataService EOD hit: %s", key)
            return entry
        logger.warning(
            "OfflineMarketDataService: no cached data for key='%s'. "
            "Returning None (caller should handle gracefully).",
            key,
        )
        return None

    def get_all_keys(self) -> List[str]:
        """List all keys with cached data."""
        return list(set(list(self._live_store.keys()) + list(self._eod_store.keys())))

    def get_cache_meta(self) -> Dict[str, Any]:
        """Return metadata dict: keys, last-updated timestamps, sizes."""
        return {
            "live_keys":  list(self._live_store.keys()),
            "eod_keys":   list(self._eod_store.keys()),
            "last_update": self._meta,
        }

    # ── Fallback helper ───────────────────────────────────────────────────────

    def get_with_fallback(
        self,
        key: str,
        live_fetch_fn,
        *,
        force_offline: bool = False,
    ) -> Dict[str, Any]:
        """
        Try live fetch first; on failure, log and return cached data.

        Args:
            key:           cache key
            live_fetch_fn: zero-arg callable that returns fresh data or raises
            force_offline: if True, skip live fetch entirely

        Returns:
            { "data": ..., "cached_at": ..., "data_source": "live"|"cached"|"offline" }
        """
        if not force_offline:
            try:
                data = live_fetch_fn()
                if data is not None:
                    self.store_live_response(key, data)
                    return {"data": data, "cached_at": _utc_now(), "data_source": "live"}
            except Exception as exc:
                logger.warning(
                    "Live fetch failed for key='%s', falling back to cache. Error: %s",
                    key, exc,
                )

        cached = self.get_cached(key)
        if cached:
            logger.warning(
                "Returning %s data for key='%s' (cached_at=%s)",
                cached["data_source"], key, cached.get("cached_at"),
            )
            return cached

        logger.warning("No cached data available for key='%s'", key)
        return {"data": None, "cached_at": None, "data_source": "offline"}

    # ── Disk persistence ──────────────────────────────────────────────────────

    def _persist_live(self) -> None:
        """Persist live store to disk (fire-and-forget, errors are non-fatal)."""
        try:
            _ensure_cache_dir()
            with open(_LIVE_FILE, "w") as f:
                json.dump({"store": self._live_store, "meta": self._meta}, f)
        except Exception as e:
            logger.warning("OfflineMarketDataService: could not persist live cache: %s", e)

    def _persist_eod(self) -> None:
        """Persist EOD store to disk."""
        try:
            _ensure_cache_dir()
            with open(_EOD_FILE, "w") as f:
                json.dump(self._eod_store, f)
        except Exception as e:
            logger.warning("OfflineMarketDataService: could not persist EOD cache: %s", e)

    def _load_from_disk(self) -> None:
        """Load previously persisted caches on startup."""
        try:
            if os.path.exists(_LIVE_FILE):
                with open(_LIVE_FILE) as f:
                    d = json.load(f)
                self._live_store = d.get("store", {})
                self._meta       = d.get("meta", {})
        except Exception as e:
            logger.warning("OfflineMarketDataService: could not load live cache: %s", e)

        try:
            if os.path.exists(_EOD_FILE):
                with open(_EOD_FILE) as f:
                    self._eod_store = json.load(f)
        except Exception as e:
            logger.warning("OfflineMarketDataService: could not load EOD cache: %s", e)


# ── Module-level singleton ─────────────────────────────────────────────────────
offline_market_data = OfflineMarketDataService()
