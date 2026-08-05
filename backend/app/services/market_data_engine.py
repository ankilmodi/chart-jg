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
from datetime import date, datetime, timedelta, timezone
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

        from concurrent.futures import ThreadPoolExecutor

        def fetch_worker(t: str):
            snap = self._fetch_one(t, st, period=period)
            if snap:
                key = f"live_{t}"
                self._cache.set(key, snap)
            return t, snap

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch_worker, t) for t in missing]
            for future in futures:
                try:
                    t, snap = future.result()
                    result[t] = snap if snap else self._cache.get_last_known(f"live_{t}")
                except Exception as exc:
                    logger.debug("getBatchData worker error: %s", exc)

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
        self, ticker: str, st: SessionType, period: str = "5d"
    ) -> Optional[StockSnapshot]:
        """Core live fetch for a single ticker using direct Yahoo Chart API with retry."""
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        for attempt in range(3):
            try:
                import requests
                url = f'https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range={period}'
                r = requests.get(url, headers=headers, timeout=6)
                if r.status_code == 200:
                    res = r.json()['chart']['result'][0]
                    timestamps = res.get('timestamp')
                    quote = res['indicators']['quote'][0]
                    closes = [c for c in quote.get('close', []) if c is not None]
                    opens  = [o for o in quote.get('open', [])  if o is not None]
                    highs  = [h for h in quote.get('high', [])  if h is not None]
                    lows   = [l for l in quote.get('low', [])   if l is not None]
                    vols   = [v for v in quote.get('volume', []) if v is not None]

                    if closes:
                        ltp      = float(closes[-1])
                        prev     = float(closes[-2]) if len(closes) >= 2 else ltp
                        chg      = round(ltp - prev, 2)
                        chg_pct  = round((chg / prev * 100) if prev else 0.0, 2)
                        vol_val  = int(vols[-1]) if vols else 0
                        avg_vol  = int(sum(vols) / len(vols)) if vols else 0
                        spread   = max(0.05, round(ltp * 0.0004, 2))
                        as_of_str= datetime.fromtimestamp(timestamps[-1], tz=timezone.utc).strftime("%Y-%m-%d") if timestamps else self._utc_str()

                        return StockSnapshot(
                            symbol      = ticker,
                            ltp         = round(ltp, 2),
                            open        = round(float(opens[-1]),  2) if opens else ltp,
                            high        = round(float(highs[-1]),  2) if highs else ltp,
                            low         = round(float(lows[-1]),   2) if lows  else ltp,
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
                            as_of       = as_of_str,
                            fetched_at  = self._utc_str(),
                        )
            except Exception as exc:
                logger.debug("_fetch_one direct chart(%s) attempt %d: %s", ticker, attempt + 1, exc)
                if attempt < 2:
                    time.sleep(0.5 * (attempt + 1))
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
