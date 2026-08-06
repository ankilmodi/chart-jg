"""
Market data service.
Primary  : yfinance 1.x  (Yahoo Finance – free, no API key)
Fallback : TwelveData free API (requires TWELVEDATA_API_KEY in .env)

NOTE: yfinance 1.0 changed the API – fast_info attributes are different.
This module is written for yfinance >= 1.0.
"""
import logging
import time
from datetime import datetime, timezone
from typing import Optional, Tuple, List
import os

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# ^NSEI  = Nifty 50 spot index  (best free proxy for NIFTY FUTURE)
NIFTY_TICKER = "^NSEI"

TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY", "")

# ---------------------------------------------------------------------------
# Simple in-memory cache
# ---------------------------------------------------------------------------

_cache: dict = {}
CACHE_TTL = 60  # seconds (live)
CACHE_TTL_OFFLINE = 3600  # 1 hour when market is closed


def _get_data_source_label() -> str:
    """Return 'live' when market is open, 'offline_eod' when closed."""
    try:
        from app.services.market_session import market_session
        return "live" if market_session.is_market_open() else "offline_eod"
    except Exception:
        import pytz
        from datetime import time as _time
        now = datetime.now(pytz.timezone("Asia/Kolkata"))
        if now.weekday() >= 5:
            return "offline_eod"
        t = now.time().replace(tzinfo=None)
        return "live" if _time(9, 15) <= t <= _time(15, 30) else "offline_eod"


def _get_cache_ttl() -> int:
    return CACHE_TTL if _get_data_source_label() == "live" else CACHE_TTL_OFFLINE


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _cached(key: str, ttl: int = None):
    effective_ttl = ttl if ttl is not None else _get_cache_ttl()
    if key in _cache:
        value, ts = _cache[key]
        if time.time() - ts < effective_ttl:
            return value
    return None


def _set_cache(key: str, value):
    _cache[key] = (value, time.time())


# ---------------------------------------------------------------------------
# yfinance helpers (1.x compatible)
# ---------------------------------------------------------------------------

def _normalise_df(df: pd.DataFrame) -> Optional[pd.DataFrame]:
    """Rename yfinance columns to lowercase OHLCV, drop NaN rows."""
    if df is None or df.empty:
        return None
    rename = {
        "Open": "open", "High": "high", "Low": "low",
        "Close": "close", "Volume": "volume",
    }
    df = df.rename(columns=rename)
    needed = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
    if len(needed) < 4:
        return None
    df = df[needed].copy()
    # Fill missing volume with 0
    if "volume" not in df.columns:
        df["volume"] = 0
    df = df.dropna(subset=["open", "high", "low", "close"])
    if df.empty:
        return None
    df.index = pd.to_datetime(df.index, utc=True)
    return df


def _fetch_yfinance(period: str = "5d", interval: str = "5m") -> Optional[pd.DataFrame]:
    """Intraday OHLCV from Yahoo Finance."""
    try:
        import yfinance as yf
        df = yf.download(
            NIFTY_TICKER,
            period=period,
            interval=interval,
            auto_adjust=True,
            progress=False,
            multi_level_index=False,
        )
        return _normalise_df(df)
    except Exception as e:
        logger.warning("yfinance intraday error: %s", e)
        return None


def _fetch_yfinance_daily(period: str = "200d") -> Optional[pd.DataFrame]:
    """Daily OHLCV from Yahoo Finance."""
    try:
        import yfinance as yf
        df = yf.download(
            NIFTY_TICKER,
            period=period,
            interval="1d",
            auto_adjust=True,
            progress=False,
            multi_level_index=False,
        )
        return _normalise_df(df)
    except Exception as e:
        logger.warning("yfinance daily error: %s", e)
        return None


def _fetch_yfinance_snapshot() -> Optional[dict]:
    """Get current quote for NIFTY 50 index using official NSE India & direct Yahoo Chart API."""
    import requests
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

    # 1. Try official NSE India direct API first
    try:
        session = requests.Session()
        session.headers.update(headers)
        session.headers.update({'Referer': 'https://www.nseindia.com/'})
        session.get('https://www.nseindia.com', timeout=4)
        r = session.get('https://www.nseindia.com/api/allIndices', timeout=6)
        if r.status_code == 200:
            for item in r.json().get('data', []):
                if item.get('index') == 'NIFTY 50':
                    last = float(item.get('last', 0))
                    prev = float(item.get('previousClose', 0)) or last
                    open_val = float(item.get('open', 0)) or last
                    high_val = float(item.get('high', 0)) or last
                    low_val  = float(item.get('low', 0)) or last
                    if last > 0:
                        return {
                            "price": last,
                            "prev_close": prev,
                            "open": open_val,
                            "high": high_val,
                            "low": low_val,
                            "volume": 0,
                        }
    except Exception as e:
        logger.debug("_fetch_yfinance_snapshot NSE error: %s", e)

    # 2. Try Yahoo Direct Chart API
    try:
        url = 'https://query2.finance.yahoo.com/v8/finance/chart/^NSEI?interval=1d&range=5d'
        r = requests.get(url, headers=headers, timeout=6)
        if r.status_code == 200:
            meta = r.json()['chart']['result'][0]['meta']
            price = meta.get('regularMarketPrice')
            prev  = meta.get('chartPreviousClose') or price
            open_val = meta.get('regularMarketDayOpen') or price
            high_val = meta.get('regularMarketDayHigh') or price
            low_val  = meta.get('regularMarketDayLow') or price
            if price and price > 0:
                return {
                    "price": price,
                    "prev_close": prev,
                    "open": open_val,
                    "high": high_val,
                    "low": low_val,
                    "volume": 0,
                }
    except Exception as e:
        logger.debug("_fetch_yfinance_snapshot Yahoo error: %s", e)

    try:
        import yfinance as yf
        ticker = yf.Ticker(NIFTY_TICKER)
        fi     = ticker.fast_info

        def _get(*attrs):
            for a in attrs:
                try:
                    v = getattr(fi, a, None)
                    if v is not None:
                        f = float(v)
                        if not (np.isnan(f) or np.isinf(f)):
                            return f
                except Exception:
                    pass
            return None

        price     = _get("last_price", "lastPrice", "regularMarketPrice")
        prev_cls  = _get("previous_close", "previousClose", "regularMarketPreviousClose")
        open_     = _get("open", "regularMarketOpen")
        day_high  = _get("day_high", "regularMarketDayHigh")
        day_low   = _get("day_low",  "regularMarketDayLow")
        volume    = _get("last_volume", "regularMarketVolume", "three_month_average_volume")

        if price is None or price <= 0:
            return None

        return {
            "price":      price,
            "prev_close": prev_cls or price,
            "open":       open_    or price,
            "high":       day_high or price,
            "low":        day_low  or price,
            "volume":     int(volume) if volume else 0,
        }
    except Exception as e:
        logger.warning("yfinance fast_info error: %s", e)
        return None


# ---------------------------------------------------------------------------
# TwelveData fallback
# ---------------------------------------------------------------------------

def _fetch_twelvedata(outputsize: int = 100, interval: str = "5min") -> Optional[pd.DataFrame]:
    """Fetch data from TwelveData free tier (needs API key)."""
    if not TWELVEDATA_API_KEY:
        return None
    try:
        import httpx
        url = (
            f"https://api.twelvedata.com/time_series"
            f"?symbol=NIFTY&exchange=NSE&interval={interval}"
            f"&outputsize={outputsize}&apikey={TWELVEDATA_API_KEY}"
        )
        resp = httpx.get(url, timeout=10)
        data = resp.json()
        if "values" not in data:
            logger.warning("TwelveData response: %s", data.get("message", "no values"))
            return None
        records = [
            {
                "timestamp": pd.to_datetime(v["datetime"]),
                "open":   float(v["open"]),
                "high":   float(v["high"]),
                "low":    float(v["low"]),
                "close":  float(v["close"]),
                "volume": int(v.get("volume", 0)),
            }
            for v in data["values"]
        ]
        df = pd.DataFrame(records).set_index("timestamp").sort_index()
        return df
    except Exception as e:
        logger.warning("TwelveData error: %s", e)
        return None


# ---------------------------------------------------------------------------
# Offline / Synthetic Data Generator Fallback
# ---------------------------------------------------------------------------

def _generate_synthetic_ohlcv(periods: int = 100, base_price: float = 24800.0) -> pd.DataFrame:
    """Generate realistic synthetic OHLCV data for offline mode."""
    end_time = datetime.now(timezone.utc)
    timestamps = [end_time - pd.Timedelta(minutes=5 * (periods - 1 - i)) for i in range(periods)]
    
    np.random.seed(42)
    returns = np.random.normal(0.0001, 0.0015, periods)
    price_path = base_price * np.exp(np.cumsum(returns))
    
    records = []
    for i in range(periods):
        c = float(price_path[i])
        o = float(price_path[i - 1]) if i > 0 else c * 0.999
        h = max(o, c) + abs(float(np.random.normal(0, c * 0.001)))
        l = min(o, c) - abs(float(np.random.normal(0, c * 0.001)))
        v = int(np.random.uniform(50000, 250000))
        records.append({
            "timestamp": timestamps[i],
            "open": round(o, 2),
            "high": round(h, 2),
            "low": round(l, 2),
            "close": round(c, 2),
            "volume": v
        })
        
    df = pd.DataFrame(records).set_index("timestamp")
    return df


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_ohlcv(period: str = "5d", interval: str = "5m") -> Tuple[Optional[pd.DataFrame], str]:
    """
    Returns (DataFrame, source_name).
    Columns: open, high, low, close, volume  (lowercase)
    """
    cache_key = f"ohlcv_{period}_{interval}"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    df = _fetch_yfinance(period=period, interval=interval)
    source = "yahoo_finance"

    if df is None or df.empty:
        logger.info("Yahoo Finance failed, trying TwelveData…")
        df = _fetch_twelvedata(outputsize=100, interval="5min")
        source = "twelvedata"

    if df is None or df.empty:
        logger.info("Online APIs unavailable, using Offline Synthetic Data…")
        df = _generate_synthetic_ohlcv(periods=100, base_price=24800.0)
        source = "offline_simulated"

    result = (df, source)
    _set_cache(cache_key, result)
    return result


def get_daily_ohlcv() -> Tuple[Optional[pd.DataFrame], str]:
    """Daily OHLCV for long-period indicators (EMA200, SMA200 etc.)."""
    cache_key = "daily_ohlcv"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    df = _fetch_yfinance_daily(period="200d")
    source = "yahoo_finance_daily"

    if df is None or df.empty:
        logger.info("Online APIs unavailable, using Offline Daily Synthetic Data…")
        df = _generate_synthetic_ohlcv(periods=200, base_price=24800.0)
        source = "offline_simulated"

    result = (df, source)
    _set_cache(cache_key, result)
    return result



def get_market_snapshot() -> Optional[dict]:
    """Return current price + OHLCV as a plain dict."""
    cache_key = "market_snapshot"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    snap = _fetch_yfinance_snapshot()

    # If fast_info failed, fall back to latest bar from intraday data
    if snap is None:
        df, _ = get_ohlcv(period="1d", interval="5m")
        if df is not None and not df.empty:
            last  = df.iloc[-1]
            first = df.iloc[0]
            snap = {
                "price":      float(last["close"]),
                "prev_close": float(first["open"]),
                "open":       float(first["open"]),
                "high":       float(df["high"].max()),
                "low":        float(df["low"].min()),
                "volume":     int(df["volume"].sum()),
            }

    if snap is None:
        return None

    price     = snap["price"]
    prev_cls  = snap["prev_close"]
    change    = price - prev_cls
    change_pct = (change / prev_cls * 100) if prev_cls else 0.0

    result = {
        "symbol":       "NIFTY FUTURE",
        "price":        round(price, 2),
        "open":         round(snap["open"], 2),
        "high":         round(snap["high"], 2),
        "low":          round(snap["low"],  2),
        "close":        round(price, 2),
        "prev_close":   round(prev_cls, 2),
        "volume":       snap["volume"],
        "change":       round(change, 2),
        "change_pct":   round(change_pct, 2),
        "timestamp":    _now_str(),
        "last_updated": _now_str(),
        "data_source":  _get_data_source_label(),
    }
    _set_cache(cache_key, result)
    return result


def get_history_candles(limit: int = 100) -> List[dict]:
    """Return last N 5-min candles as a list of dicts."""
    cache_key = f"history_{limit}"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    df, _ = get_ohlcv(period="5d", interval="5m")
    if df is None or df.empty:
        return []

    df = df.tail(limit)
    candles = []
    for idx, row in df.iterrows():
        candles.append({
            "timestamp": str(idx),
            "open":   round(float(row["open"]),   2),
            "high":   round(float(row["high"]),   2),
            "low":    round(float(row["low"]),    2),
            "close":  round(float(row["close"]),  2),
            "volume": int(row["volume"]),
        })
    _set_cache(cache_key, candles)
    return candles


def clear_cache():
    """Force-clear all cached data so next request fetches fresh."""
    global _cache
    _cache = {}
    logger.info("Cache cleared")
