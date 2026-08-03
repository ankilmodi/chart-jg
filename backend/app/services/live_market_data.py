"""
app/services/live_market_data.py
─────────────────────────────────
LiveMarketDataService — fetches real-time stock/index data from yfinance
during market hours.

Responsibilities
  - Fetch live OHLCV snapshots for individual symbols or index
  - Cache each response (default 10 s TTL) to avoid hammering the API
  - Expose get_live_snapshot(symbol) → dict
  - Log every API failure at WARNING level

Design: thin repository wrapper over yfinance with TTL cache.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# ── Simple TTL cache ──────────────────────────────────────────────────────────

class _TTLCache:
    """Minimal in-process dict cache with TTL expiry."""

    def __init__(self) -> None:
        self._data: Dict[str, tuple[float, Any]] = {}

    def get(self, key: str, ttl: float) -> Optional[Any]:
        entry = self._data.get(key)
        if entry is None:
            return None
        stored_at, value = entry
        if time.monotonic() - stored_at > ttl:
            del self._data[key]
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._data[key] = (time.monotonic(), value)

    def clear(self) -> None:
        self._data.clear()

    def delete(self, key: str) -> None:
        self._data.pop(key, None)


# ── Service ──────────────────────────────────────────────────────────────────

class LiveMarketDataService:
    """
    Fetches live market data via yfinance.

    Usage:
        service = LiveMarketDataService(cache_ttl=10)
        data = service.get_live_snapshot("RELIANCE.NS")
    """

    def __init__(self, cache_ttl: int = 10) -> None:
        """
        Args:
            cache_ttl: seconds to cache each symbol's data (default 10 s).
        """
        self._cache = _TTLCache()
        self._cache_ttl = cache_ttl
        logger.info("LiveMarketDataService initialised | cache_ttl=%ds", cache_ttl)

    # ── Public API ────────────────────────────────────────────────────────────

    def get_live_snapshot(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Return live OHLCV + change data for a ticker symbol.

        Args:
            ticker: Yahoo Finance ticker (e.g. "RELIANCE.NS", "^NSEI")

        Returns:
            dict with keys: symbol, price, open, high, low, prev_close,
                            change, change_pct, volume, timestamp
            None if data unavailable.
        """
        cached = self._cache.get(ticker, self._cache_ttl)
        if cached is not None:
            logger.debug("LiveMarketDataService cache hit: %s", ticker)
            return cached

        try:
            import yfinance as yf
            info = yf.Ticker(ticker).fast_info
            price = float(info.get("last_price") or info.get("previousClose") or 0)
            prev_close = float(info.get("previousClose") or price)
            change = round(price - prev_close, 2)
            change_pct = round((change / prev_close * 100) if prev_close else 0, 2)

            data: Dict[str, Any] = {
                "symbol":      ticker,
                "price":       round(price, 2),
                "open":        round(float(info.get("open") or price), 2),
                "high":        round(float(info.get("dayHigh") or price), 2),
                "low":         round(float(info.get("dayLow") or price), 2),
                "prev_close":  round(prev_close, 2),
                "change":      change,
                "change_pct":  change_pct,
                "volume":      int(info.get("three_month_average_volume") or 0),
                "market_cap":  info.get("market_cap"),
                "data_source": "live",
                "timestamp":   _utc_now(),
            }
            self._cache.set(ticker, data)
            logger.debug("LiveMarketDataService fetched: %s @ %.2f", ticker, price)
            return data

        except Exception as exc:
            logger.warning(
                "LiveMarketDataService API failure for %s: %s", ticker, exc
            )
            return None

    def get_batch_snapshots(self, tickers: list[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Fetch latest price for a batch of tickers using yfinance bulk download.
        Much faster than individual calls.
        """
        if not tickers:
            return {}

        # Return cached entries first
        result: Dict[str, Optional[Dict[str, Any]]] = {}
        missing: list[str] = []
        for t in tickers:
            cached = self._cache.get(t, self._cache_ttl)
            if cached is not None:
                result[t] = cached
            else:
                missing.append(t)

        if not missing:
            return result

        try:
            import yfinance as yf
            import pandas as pd

            df = yf.download(
                missing,
                period="2d",
                interval="1d",
                auto_adjust=True,
                progress=False,
                multi_level_index=True,
            )

            for ticker in missing:
                try:
                    if isinstance(df.columns, pd.MultiIndex):
                        close_s = df[("Close", ticker)].dropna()
                        vol_s   = df[("Volume", ticker)].dropna()
                        open_s  = df[("Open", ticker)].dropna()
                        high_s  = df[("High", ticker)].dropna()
                        low_s   = df[("Low", ticker)].dropna()
                    else:
                        close_s = df["Close"].dropna()
                        vol_s   = df["Volume"].dropna()
                        open_s  = df["Open"].dropna()
                        high_s  = df["High"].dropna()
                        low_s   = df["Low"].dropna()

                    if len(close_s) < 1:
                        raise ValueError("no data")

                    price     = float(close_s.iloc[-1])
                    prev      = float(close_s.iloc[-2]) if len(close_s) >= 2 else price
                    change    = round(price - prev, 2)
                    change_pct = round((change / prev * 100) if prev else 0, 2)

                    data = {
                        "symbol":      ticker,
                        "price":       round(price, 2),
                        "open":        round(float(open_s.iloc[-1]), 2) if len(open_s) >= 1 else price,
                        "high":        round(float(high_s.iloc[-1]), 2) if len(high_s) >= 1 else price,
                        "low":         round(float(low_s.iloc[-1]),  2) if len(low_s)  >= 1 else price,
                        "prev_close":  round(prev, 2),
                        "change":      change,
                        "change_pct":  change_pct,
                        "volume":      int(vol_s.iloc[-1]) if len(vol_s) >= 1 else 0,
                        "data_source": "live",
                        "timestamp":   _utc_now(),
                    }
                    self._cache.set(ticker, data)
                    result[ticker] = data

                except Exception as e:
                    logger.warning("Batch fetch failed for %s: %s", ticker, e)
                    result[ticker] = None

        except Exception as exc:
            logger.warning("LiveMarketDataService batch download failed: %s", exc)
            for t in missing:
                result[t] = None

        return result

    def clear_cache(self, ticker: Optional[str] = None) -> None:
        """Clear cache for a specific ticker, or all if ticker is None."""
        if ticker:
            self._cache.delete(ticker)
        else:
            self._cache.clear()
        logger.info("LiveMarketDataService cache cleared (ticker=%s)", ticker or "ALL")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utc_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


# ── Module-level singleton ─────────────────────────────────────────────────────
live_market_data = LiveMarketDataService(cache_ttl=10)
