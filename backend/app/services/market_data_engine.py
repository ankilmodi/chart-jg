"""
app/services/market_data_engine.py
═══════════════════════════════════════════════════════════════════════════════
MarketDataEngine — Central orchestrator for LIVE ↔ EOD switching.

Architecture
────────────
  ┌─────────────────────────────────────────────────┐
  │             MarketDataEngine                    │
  │  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
  │  │ Session    │  │ CacheLayer │  │ Fetcher  │  │
  │  │ Detector   │  │ (TTL-aware)│  │ (retry)  │  │
  │  └────────────┘  └────────────┘  └──────────┘  │
  └─────────────────────────────────────────────────┘
         │
         ├── isMarketOpen()       → bool
         ├── isHoliday()          → bool
         ├── getMarketStatus()    → MarketEngineStatus
         ├── getLiveData(sym)     → StockSnapshot
         ├── getClosingData(sym)  → StockSnapshot   (today's EOD)
         ├── getPreviousDayData() → StockSnapshot   (last trading day)
         └── getBatchData(syms)   → dict[sym, StockSnapshot]

Session Logic
─────────────
  IF   09:15 ≤ IST ≤ 15:30  AND  trading_day → LIVE  (poll every 5–10 s)
  ELIF IST < 09:15           AND  trading_day → PRE_OPEN (show prev close)
  ELIF IST > 15:30           AND  trading_day → AFTER_HOURS (show today EOD)
  ELIF weekend                                → WEEKEND (show prev close)
  ELIF holiday                                → HOLIDAY (show prev close)

Timezone: Always Asia/Kolkata (IST).  Never relies on server OS timezone.
"""
from __future__ import annotations

import logging
import time
import threading
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

import pytz

logger = logging.getLogger(__name__)
IST = pytz.timezone("Asia/Kolkata")


# ══════════════════════════════════════════════════════════════════════════════
# Session types
# ══════════════════════════════════════════════════════════════════════════════

class SessionType(str, Enum):
    LIVE        = "LIVE"         # 09:15 – 15:30 IST, trading day
    PRE_OPEN    = "PRE_OPEN"     # 09:00 – 09:15 IST
    AFTER_HOURS = "AFTER_HOURS"  # > 15:30 IST, trading day
    HOLIDAY     = "HOLIDAY"      # NSE holiday
    WEEKEND     = "WEEKEND"      # Sat / Sun


# TTL per session (seconds)
_SESSION_TTL: Dict[SessionType, int] = {
    SessionType.LIVE:        8,     # ~10-second live refresh
    SessionType.PRE_OPEN:    60,    # 1-min during pre-open
    SessionType.AFTER_HOURS: 300,   # 5-min after close
    SessionType.HOLIDAY:     3600,  # 1-hour on holidays
    SessionType.WEEKEND:     3600,  # 1-hour on weekends
}

# Refresh interval for client polling (seconds)
_CLIENT_REFRESH: Dict[SessionType, int] = {
    SessionType.LIVE:        8,
    SessionType.PRE_OPEN:    30,
    SessionType.AFTER_HOURS: 300,
    SessionType.HOLIDAY:     3600,
    SessionType.WEEKEND:     3600,
}


# ══════════════════════════════════════════════════════════════════════════════
# Data models
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class StockSnapshot:
    """OHLCV + derived fields for one symbol at one moment in time."""
    symbol:       str
    name:         str           = ""
    ltp:          float         = 0.0   # Last Traded Price
    open:         float         = 0.0
    high:         float         = 0.0
    low:          float         = 0.0
    close:        float         = 0.0
    prev_close:   float         = 0.0
    change:       float         = 0.0
    change_pct:   float         = 0.0
    volume:       int           = 0
    avg_volume:   int           = 0
    vwap:         float         = 0.0
    bid:          float         = 0.0
    ask:          float         = 0.0
    oi:           int           = 0     # Open Interest (F&O only)
    market_cap:   Optional[float] = None
    data_source:  str           = "unknown"   # "live" | "eod" | "prev_close" | "offline"
    session_type: str           = "UNKNOWN"
    as_of:        str           = ""          # ISO timestamp of data
    fetched_at:   str           = ""          # when we fetched it

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class IndexSnapshot:
    """Index-level data (NIFTY 50, BANK NIFTY, VIX)."""
    symbol:       str
    name:         str     = ""
    price:        float   = 0.0
    open:         float   = 0.0
    high:         float   = 0.0
    low:          float   = 0.0
    prev_close:   float   = 0.0
    change:       float   = 0.0
    change_pct:   float   = 0.0
    volume:       int     = 0
    data_source:  str     = "unknown"
    session_type: str     = "UNKNOWN"
    as_of:        str     = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class MarketEngineStatus:
    """Full status returned to API callers and the frontend."""
    session_type:       str      # SessionType value
    is_market_open:     bool
    is_trading_day:     bool
    is_holiday:         bool
    holiday_name:       Optional[str]
    data_mode:          str      # "live" | "eod" | "prev_close"
    message:            str
    current_time_ist:   str
    open_time:          str      = "09:15"
    close_time:         str      = "15:30"
    pre_open_start:     str      = "09:00"
    next_open:          Optional[str] = None
    next_open_readable: Optional[str] = None
    cache_ttl_seconds:  int      = 300
    client_refresh_sec: int      = 300
    last_eod_stored_at: Optional[str] = None
    server_time_ist:    str      = ""

    def to_dict(self) -> dict:
        return asdict(self)


# ══════════════════════════════════════════════════════════════════════════════
# Smart TTL Cache
# ══════════════════════════════════════════════════════════════════════════════

class _EngineCache:
    """Thread-safe TTL cache with session-aware expiry and last-known fallback."""

    def __init__(self) -> None:
        self._store: Dict[str, tuple[float, Any]] = {}   # key → (stored_at, value)
        self._last_known: Dict[str, Any] = {}            # never expires – fallback
        self._lock = threading.RLock()

    def get(self, key: str, ttl: float) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            stored_at, value = entry
            if time.monotonic() - stored_at > ttl:
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._store[key] = (time.monotonic(), value)
            self._last_known[key] = value

    def get_last_known(self, key: str) -> Optional[Any]:
        with self._lock:
            return self._last_known.get(key)

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear_live_entries(self) -> None:
        """Wipe live-data cache entries at session change (09:15, 15:30)."""
        with self._lock:
            self._store.clear()
            logger.info("EngineCache: live entries cleared on session change")

    def snapshot_eod(self) -> Dict[str, Any]:
        """Return a copy of all current last-known values as EOD snapshot."""
        with self._lock:
            return dict(self._last_known)


# ══════════════════════════════════════════════════════════════════════════════
# Market Data Engine
# ══════════════════════════════════════════════════════════════════════════════

class MarketDataEngine:
    """
    Central market data orchestrator.

    Automatically switches between LIVE, EOD, and PRE_CLOSE data modes
    based on Indian stock market session state.

    Usage:
        engine = MarketDataEngine()
        status = engine.getMarketStatus()
        if engine.isMarketOpen():
            data = engine.getLiveData("RELIANCE.NS")
        else:
            data = engine.getClosingData("RELIANCE.NS")
    """

    def __init__(self) -> None:
        from app.services.market_session import market_session as _ms
        self._ms = _ms
        self._cache = _EngineCache()
        self._eod_store: Dict[str, Any] = {}
        self._eod_stored_at: Optional[str] = None
        self._last_session: Optional[SessionType] = None
        logger.info("MarketDataEngine initialised")

    # ── Session helpers ─────────────────────────────────────────────────────

    def _now_ist(self) -> datetime:
        return datetime.now(IST)

    def _ist_time_str(self) -> str:
        return self._now_ist().strftime("%Y-%m-%d %H:%M:%S IST")

    def _utc_str(self) -> str:
        from datetime import timezone
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    def getSessionType(self) -> SessionType:
        """Determine current NSE session type from IST clock."""
        now = self._now_ist()
        t   = now.time()

        from datetime import time as _time
        PRE_OPEN_START = _time(9,  0)
        OPEN           = _time(9,  15)
        CLOSE          = _time(15, 30)

        is_td = self._ms.is_trading_day(now)

        if not is_td:
            if self._ms._holidays.get(now.date().isoformat()):
                return SessionType.HOLIDAY
            return SessionType.WEEKEND

        if t < PRE_OPEN_START:
            return SessionType.WEEKEND   # before 09:00 on a weekday → treated as prev-day
        if PRE_OPEN_START <= t < OPEN:
            return SessionType.PRE_OPEN
        if OPEN <= t <= CLOSE:
            return SessionType.LIVE
        return SessionType.AFTER_HOURS

    def isMarketOpen(self) -> bool:
        return self.getSessionType() == SessionType.LIVE

    def isHoliday(self) -> bool:
        st = self.getSessionType()
        return st == SessionType.HOLIDAY

    def isTradingDay(self) -> bool:
        return self._ms.is_trading_day()

    # ── Status ──────────────────────────────────────────────────────────────

    def getMarketStatus(self) -> MarketEngineStatus:
        """Return full MarketEngineStatus for API and UI consumption."""
        st   = self.getSessionType()
        now  = self._now_ist()
        base = self._ms.get_market_status()

        is_open   = (st == SessionType.LIVE)
        is_td     = self._ms.is_trading_day(now)
        is_hol    = (st == SessionType.HOLIDAY)
        hol_name  = self._ms._holidays.get(now.date().isoformat())

        data_mode_map = {
            SessionType.LIVE:        "live",
            SessionType.PRE_OPEN:    "prev_close",
            SessionType.AFTER_HOURS: "eod",
            SessionType.HOLIDAY:     "prev_close",
            SessionType.WEEKEND:     "prev_close",
        }
        message_map = {
            SessionType.LIVE:        "🟢 Market LIVE — Real-time data active",
            SessionType.PRE_OPEN:    "🟡 Pre-Open Session — Showing previous close",
            SessionType.AFTER_HOURS: "🔴 Market Closed — Showing today's EOD data",
            SessionType.HOLIDAY:     f"🏖️ Market Holiday — {hol_name or 'NSE Holiday'}",
            SessionType.WEEKEND:     "🔴 Weekend — Market closed",
        }

        ttl = _SESSION_TTL[st]
        cli = _CLIENT_REFRESH[st]

        # Next open readable
        next_open_readable = None
        if base.next_open:
            try:
                d = datetime.fromisoformat(base.next_open)
                next_open_readable = d.strftime("%a %d %b %Y, %I:%M %p IST")
            except Exception:
                next_open_readable = base.next_open

        # Session-change detection → flush cache
        if self._last_session != st:
            logger.info(
                "MarketDataEngine session change: %s → %s",
                self._last_session, st.value
            )
            self._cache.clear_live_entries()
            self._last_session = st

        return MarketEngineStatus(
            session_type       = st.value,
            is_market_open     = is_open,
            is_trading_day     = is_td,
            is_holiday         = is_hol,
            holiday_name       = hol_name,
            data_mode          = data_mode_map[st],
            message            = message_map[st],
            current_time_ist   = self._ist_time_str(),
            next_open          = base.next_open,
            next_open_readable = next_open_readable,
            cache_ttl_seconds  = ttl,
            client_refresh_sec = cli,
            last_eod_stored_at = self._eod_stored_at,
            server_time_ist    = self._ist_time_str(),
        )

    # ── Live data ───────────────────────────────────────────────────────────

    def getLiveData(self, ticker: str) -> Optional[StockSnapshot]:
        """
        Fetch live OHLCV snapshot for one ticker.
        Cached for SESSION_TTL seconds. Falls back to last-known on failure.
        """
        st     = self.getSessionType()
        ttl    = _SESSION_TTL[st]
        key    = f"live_{ticker}"
        cached = self._cache.get(key, ttl)
        if cached is not None:
            return cached

        snap = self._fetch_one(ticker, st)
        if snap:
            self._cache.set(key, snap)
        else:
            snap = self._cache.get_last_known(key)
            if snap:
                logger.debug("getLiveData(%s): using last-known fallback", ticker)
        return snap

    def getBatchData(
        self, tickers: List[str], *, period: str = "2d"
    ) -> Dict[str, Optional[StockSnapshot]]:
        """
        Fetch snapshots for many tickers in one yfinance batch download.
        Dramatically faster than individual calls.
        """
        st     = self.getSessionType()
        ttl    = _SESSION_TTL[st]
        result: Dict[str, Optional[StockSnapshot]] = {}
        missing: List[str] = []

        for t in tickers:
            key    = f"live_{t}"
            cached = self._cache.get(key, ttl)
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
                period   = period,
                interval = "1d",
                auto_adjust = True,
                progress    = False,
                multi_level_index = True,
            )
            is_multi = isinstance(df.columns, pd.MultiIndex)
            now_str  = self._utc_str()

            for ticker in missing:
                try:
                    if is_multi:
                        close_s  = df[("Close",  ticker)].dropna()
                        vol_s    = df[("Volume", ticker)].dropna()
                        open_s   = df[("Open",   ticker)].dropna()
                        high_s   = df[("High",   ticker)].dropna()
                        low_s    = df[("Low",    ticker)].dropna()
                    else:
                        close_s  = df["Close"].dropna()
                        vol_s    = df["Volume"].dropna()
                        open_s   = df["Open"].dropna()
                        high_s   = df["High"].dropna()
                        low_s    = df["Low"].dropna()

                    if len(close_s) < 1:
                        raise ValueError("empty")

                    ltp      = float(close_s.iloc[-1])
                    prev     = float(close_s.iloc[-2]) if len(close_s) >= 2 else ltp
                    chg      = round(ltp - prev, 2)
                    chg_pct  = round((chg / prev * 100) if prev else 0.0, 2)
                    vol_val  = int(vol_s.iloc[-1]) if len(vol_s) >= 1 else 0
                    avg_vol  = int(vol_s.mean())    if len(vol_s) >= 1 else 0
                    spread   = max(0.05, round(ltp * 0.0004, 2))

                    snap = StockSnapshot(
                        symbol      = ticker,
                        ltp         = round(ltp,  2),
                        open        = round(float(open_s.iloc[-1]),  2) if len(open_s)  >= 1 else ltp,
                        high        = round(float(high_s.iloc[-1]),  2) if len(high_s)  >= 1 else ltp,
                        low         = round(float(low_s.iloc[-1]),   2) if len(low_s)   >= 1 else ltp,
                        close       = round(ltp,  2),
                        prev_close  = round(prev, 2),
                        change      = chg,
                        change_pct  = chg_pct,
                        volume      = vol_val,
                        avg_volume  = avg_vol,
                        vwap        = round(ltp * 0.9998, 2),   # approximate
                        bid         = round(ltp - spread / 2, 2),
                        ask         = round(ltp + spread / 2, 2),
                        data_source = "live" if st == SessionType.LIVE else "eod",
                        session_type= st.value,
                        as_of       = str(close_s.index[-1]),
                        fetched_at  = now_str,
                    )
                    key = f"live_{ticker}"
                    self._cache.set(key, snap)
                    result[ticker] = snap
                except Exception as exc:
                    logger.debug("batch_data(%s): %s", ticker, exc)
                    result[ticker] = self._cache.get_last_known(f"live_{ticker}")

        except Exception as exc:
            logger.warning("getBatchData download failed: %s", exc)
            for t in missing:
                result[t] = self._cache.get_last_known(f"live_{t}")

        return result

    def getClosingData(self, ticker: str) -> Optional[StockSnapshot]:
        """
        Return today's EOD snapshot (stored at 15:30).
        Falls back to live fetch if EOD not yet stored.
        """
        eod = self._eod_store.get(ticker)
        if eod:
            return eod
        # Not stored yet → fall back to live fetch
        return self.getLiveData(ticker)

    def getPreviousDayData(self, ticker: str) -> Optional[StockSnapshot]:
        """Return previous trading day's closing snapshot (cached 1h)."""
        key    = f"prev_{ticker}"
        cached = self._cache.get(key, 3600)
        if cached:
            return cached
        snap = self._fetch_one(ticker, SessionType.AFTER_HOURS, period="5d")
        if snap:
            self._cache.set(key, snap)
        return snap

    # ── EOD snapshot (called by scheduler at 15:30 IST) ────────────────────

    def storeEodSnapshot(self, tickers: List[str]) -> int:
        """
        Fetch and persist EOD data for all tickers.
        Called automatically at 15:30 IST by the scheduler.
        Returns count of successfully stored tickers.
        """
        batch = self.getBatchData(tickers, period="2d")
        count = 0
        for ticker, snap in batch.items():
            if snap:
                snap.data_source  = "eod"
                snap.session_type = SessionType.AFTER_HOURS.value
                self._eod_store[ticker] = snap
                count += 1
        self._eod_stored_at = self._ist_time_str()
        logger.info("storeEodSnapshot: %d/%d tickers stored", count, len(tickers))
        return count

    # ── Index data ──────────────────────────────────────────────────────────

    def getIndexData(self, ticker: str = "^NSEI") -> Optional[IndexSnapshot]:
        """Fetch NIFTY 50, BANK NIFTY, or INDIA VIX from NSE/Yahoo direct API."""
        st  = self.getSessionType()
        ttl = _SESSION_TTL[st]
        key = f"index_{ticker}"
        cached = self._cache.get(key, ttl)
        if cached:
            return cached

        try:
            from app.scanner.market_data import fetch_live_index
            raw = fetch_live_index(ticker)
            if raw and raw.get("price", 0) > 0:
                price    = raw["price"]
                prev     = raw.get("prev_close", price)
                chg      = round(price - prev, 2)
                chg_pct  = raw.get("change_pct", round((chg / prev * 100) if prev else 0, 2))
                snap = IndexSnapshot(
                    symbol      = ticker,
                    name        = _INDEX_NAMES.get(ticker, ticker),
                    price       = round(price, 2),
                    prev_close  = round(prev,  2),
                    change      = chg,
                    change_pct  = round(chg_pct, 2),
                    data_source = "live" if st == SessionType.LIVE else "eod",
                    session_type= st.value,
                    as_of       = self._utc_str(),
                )
                self._cache.set(key, snap)
                return snap
        except Exception as exc:
            logger.warning("getIndexData(%s): %s", ticker, exc)
        return self._cache.get_last_known(f"index_{ticker}")

    # ── Internal fetch ──────────────────────────────────────────────────────

    def _fetch_one(
        self, ticker: str, st: SessionType, period: str = "2d"
    ) -> Optional[StockSnapshot]:
        """Core yfinance fetch for a single ticker with retry."""
        for attempt in range(3):
            try:
                import yfinance as yf
                df = yf.download(
                    ticker,
                    period      = period,
                    interval    = "1d",
                    auto_adjust = True,
                    progress    = False,
                    multi_level_index = False,
                )
                if df is None or df.empty:
                    continue
                df.columns = [c.lower() for c in df.columns]
                close_s = df["close"].dropna()
                if len(close_s) < 1:
                    continue

                ltp      = float(close_s.iloc[-1])
                prev     = float(close_s.iloc[-2]) if len(close_s) >= 2 else ltp
                chg      = round(ltp - prev, 2)
                chg_pct  = round((chg / prev * 100) if prev else 0.0, 2)
                vol_s    = df.get("volume", df.get("Volume"))
                vol_val  = int(vol_s.iloc[-1]) if vol_s is not None and len(vol_s) >= 1 else 0
                avg_vol  = int(vol_s.mean())    if vol_s is not None and len(vol_s) >= 1 else 0
                spread   = max(0.05, round(ltp * 0.0004, 2))

                return StockSnapshot(
                    symbol      = ticker,
                    ltp         = round(ltp, 2),
                    open        = round(float(df["open"].iloc[-1]),  2) if "open"  in df.columns else ltp,
                    high        = round(float(df["high"].iloc[-1]),  2) if "high"  in df.columns else ltp,
                    low         = round(float(df["low"].iloc[-1]),   2) if "low"   in df.columns else ltp,
                    close       = round(ltp, 2),
                    prev_close  = round(prev, 2),
                    change      = chg,
                    change_pct  = chg_pct,
                    volume      = vol_val,
                    avg_volume  = avg_vol,
                    vwap        = round(ltp * 0.9998, 2),
                    bid         = round(ltp - spread / 2, 2),
                    ask         = round(ltp + spread / 2, 2),
                    data_source = "live" if st == SessionType.LIVE else "eod",
                    session_type= st.value,
                    as_of       = str(close_s.index[-1]),
                    fetched_at  = self._utc_str(),
                )
            except Exception as exc:
                logger.debug("_fetch_one(%s) attempt %d: %s", ticker, attempt + 1, exc)
                if attempt < 2:
                    time.sleep(0.5 * (attempt + 1))  # backoff: 0.5s, 1.0s
        return None


# ── Index name map ─────────────────────────────────────────────────────────────

_INDEX_NAMES: Dict[str, str] = {
    "^NSEI":    "NIFTY 50",
    "^NSEBANK": "NIFTY BANK",
    "^INDIAVIX":"INDIA VIX",
    "^BSESN":   "SENSEX",
}


# ── Module-level singleton ─────────────────────────────────────────────────────

market_data_engine = MarketDataEngine()
