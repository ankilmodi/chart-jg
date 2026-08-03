"""
app/services/market_session.py
──────────────────────────────
MarketSessionService — detects Indian market session state (NSE/BSE).

Responsibilities
  - isMarketOpen()       → bool
  - isTradingDay()       → bool
  - getMarketStatus()    → MarketStatus (full detail)
  - shouldUseLiveData()  → bool
  - shouldUseOfflineData() → bool

Configuration (via environment / config.py):
  - Timezone  : Asia/Kolkata
  - Open time : 09:15 IST
  - Close time: 15:30 IST
  - Holidays  : loaded from holidays.json next to this file

Logging:
  - Every session state change is logged at INFO level.
  - API failures are logged at WARNING level.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import List, Optional

import pytz

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────

IST = pytz.timezone("Asia/Kolkata")

MARKET_OPEN_H,  MARKET_OPEN_M  = 9,  15
MARKET_CLOSE_H, MARKET_CLOSE_M = 15, 30

MARKET_OPEN_TIME  = time(MARKET_OPEN_H,  MARKET_OPEN_M)
MARKET_CLOSE_TIME = time(MARKET_CLOSE_H, MARKET_CLOSE_M)

# Path to holidays JSON file (same directory as this module)
_HOLIDAYS_FILE = os.path.join(os.path.dirname(__file__), "holidays.json")


# ── Data models ───────────────────────────────────────────────────────────

@dataclass
class MarketStatus:
    """Full market session status returned to callers and the API."""

    is_open:           bool
    is_trading_day:    bool
    status:            str        # "LIVE" | "CLOSED" | "PRE_OPEN" | "HOLIDAY"
    data_source:       str        # "live" | "cached" | "offline"
    message:           str
    current_time_ist:  str
    open_time:         str = "09:15"
    close_time:        str = "15:30"
    next_open:         Optional[str] = None
    holiday_name:      Optional[str] = None
    refresh_interval:  int = 300   # seconds – 5s live, 300s offline

    def to_dict(self) -> dict:
        return {
            "is_open":          self.is_open,
            "is_trading_day":   self.is_trading_day,
            "status":           self.status,
            "data_source":      self.data_source,
            "message":          self.message,
            "current_time_ist": self.current_time_ist,
            "open_time":        self.open_time,
            "close_time":       self.close_time,
            "next_open":        self.next_open,
            "holiday_name":     self.holiday_name,
            "refresh_interval": self.refresh_interval,
        }


# ── Holiday loader ────────────────────────────────────────────────────────

def _load_holidays(path: str = _HOLIDAYS_FILE) -> dict[str, str]:
    """Load holiday map {YYYY-MM-DD: holiday_name} from JSON file."""
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                raw: dict = json.load(f)
            # Validate and normalise keys to ISO date strings
            return {str(k): str(v) for k, v in raw.items()}
    except Exception as e:
        logger.warning("Could not load holidays file %s: %s", path, e)
    return {}


# ── Service ───────────────────────────────────────────────────────────────

class MarketSessionService:
    """
    Singleton-friendly service that determines the current NSE/BSE
    market session state.

    Usage:
        service = MarketSessionService()
        if service.is_market_open():
            ...
    """

    _last_status: Optional[str] = None   # track changes for logging

    def __init__(self, holidays_path: str = _HOLIDAYS_FILE) -> None:
        self._holidays: dict[str, str] = _load_holidays(holidays_path)
        logger.info(
            "MarketSessionService initialised | %d holidays loaded",
            len(self._holidays),
        )

    # ── Public API ────────────────────────────────────────────────────────

    def ist_now(self) -> datetime:
        return datetime.now(IST)

    def is_trading_day(self, dt: Optional[datetime] = None) -> bool:
        """
        Returns True if `dt` (default: now IST) is a weekday that is
        NOT listed in the holidays file.
        """
        d = (dt or self.ist_now()).date()
        if d.weekday() >= 5:          # Saturday=5, Sunday=6
            return False
        iso = d.isoformat()
        if iso in self._holidays:
            logger.debug("Holiday on %s: %s", iso, self._holidays[iso])
            return False
        return True

    def is_market_open(self, dt: Optional[datetime] = None) -> bool:
        """
        Returns True only when it is a trading day AND the current IST
        time is within [09:15, 15:30].
        """
        now = dt or self.ist_now()
        if not self.is_trading_day(now):
            return False
        t = now.time().replace(tzinfo=None)
        return MARKET_OPEN_TIME <= t <= MARKET_CLOSE_TIME

    def should_use_live_data(self) -> bool:
        return self.is_market_open()

    def should_use_offline_data(self) -> bool:
        return not self.is_market_open()

    def get_market_status(self) -> MarketStatus:
        """
        Full status object. Logs every state transition at INFO level.
        """
        now     = self.ist_now()
        now_str = now.strftime("%Y-%m-%d %H:%M:%S IST")
        today   = now.date().isoformat()
        t       = now.time().replace(tzinfo=None)

        is_trading  = self.is_trading_day(now)
        is_open     = is_trading and (MARKET_OPEN_TIME <= t <= MARKET_CLOSE_TIME)
        holiday_name = self._holidays.get(today) if not is_trading else None

        # Determine status string
        if not is_trading:
            if today in self._holidays:
                status      = "HOLIDAY"
                message     = f"Market closed — {holiday_name}"
                data_source = "offline"
            elif now.weekday() == 5:
                status      = "CLOSED"
                message     = "Market closed — Saturday"
                data_source = "offline"
            else:
                status      = "CLOSED"
                message     = "Market closed — Sunday"
                data_source = "offline"
        elif t < MARKET_OPEN_TIME:
            status      = "PRE_OPEN"
            message     = f"Pre-open session | Market opens at 09:15 IST"
            data_source = "offline"
        elif t > MARKET_CLOSE_TIME:
            status      = "CLOSED"
            message     = "Market closed — After 3:30 PM IST"
            data_source = "offline"
        else:
            status      = "LIVE"
            message     = "Market open — Live data active"
            data_source = "live"

        # Log every session change
        if status != self.__class__._last_status:
            logger.info(
                "Market session change: %s → %s | %s",
                self.__class__._last_status,
                status,
                message,
            )
            self.__class__._last_status = status

        # Compute next open time string
        next_open = self._next_open_str(now) if not is_open else None

        return MarketStatus(
            is_open          = is_open,
            is_trading_day   = is_trading,
            status           = status,
            data_source      = data_source,
            message          = message,
            current_time_ist = now_str,
            next_open        = next_open,
            holiday_name     = holiday_name,
            refresh_interval = 10 if is_open else 300,
        )

    # ── Internal helpers ──────────────────────────────────────────────────

    def _next_open_str(self, now: datetime) -> str:
        """Return ISO string for next market open (09:15 IST on next trading day)."""
        from datetime import timedelta
        candidate = now.date()
        for _ in range(10):   # look ahead up to 10 days
            candidate += timedelta(days=1)
            if self._is_trading_date(candidate):
                dt = IST.localize(
                    datetime(candidate.year, candidate.month, candidate.day,
                             MARKET_OPEN_H, MARKET_OPEN_M)
                )
                return dt.isoformat()
        return ""

    def _is_trading_date(self, d: date) -> bool:
        if d.weekday() >= 5:
            return False
        return d.isoformat() not in self._holidays

    def reload_holidays(self, path: str = _HOLIDAYS_FILE) -> int:
        """Hot-reload the holidays file without restarting."""
        self._holidays = _load_holidays(path)
        logger.info("Holidays reloaded: %d entries", len(self._holidays))
        return len(self._holidays)


# ── Module-level singleton ─────────────────────────────────────────────────
market_session = MarketSessionService()
