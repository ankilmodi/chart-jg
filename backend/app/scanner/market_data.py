"""
Market Data Service – fetches live data from Yahoo Finance for all NSE F&O stocks.
Includes batching, caching, and fallback handling.
"""
import logging
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

import pandas as pd
import numpy as np
import yfinance as yf

logger = logging.getLogger(__name__)

# ── In-memory cache ────────────────────────────────────────────────────────
_cache: Dict[str, Any]    = {}
_cache_ts: Dict[str, float] = {}
CACHE_TTL = 300   # 5 minutes

# ── Last-known prices (survive cache expiry when Yahoo is down) ────────────
_last_known: Dict[str, Dict[str, Any]] = {}


def _cached(key: str, ttl: int = CACHE_TTL) -> Optional[Any]:
    if key in _cache and (time.time() - _cache_ts.get(key, 0)) < ttl:
        return _cache[key]
    return None


def _set_cache(key: str, value: Any) -> None:
    _cache[key] = value
    _cache_ts[key] = time.time()


def clear_scanner_cache() -> None:
    _cache.clear()
    _cache_ts.clear()
    logger.info("Scanner cache cleared")


# ── Last-known OHLCV DataFrames (survive Yahoo outages) ───────────────────
_last_known_df: Dict[str, pd.DataFrame] = {}


# ── Single stock daily OHLCV ───────────────────────────────────────────────

def fetch_daily(ticker: str, period: str = "200d") -> Optional[pd.DataFrame]:
    """Fetch daily OHLCV for a single ticker. Returns lowercase-column DataFrame."""
    cache_key = f"daily_{ticker}_{period}"
    cached = _cached(cache_key)
    if cached is not None:
        return cached
    try:
        df = yf.download(
            ticker,
            period=period,
            interval="1d",
            auto_adjust=True,
            progress=False,
            multi_level_index=False,
        )
        if df is not None and not df.empty:
            df.columns = [c.lower() for c in df.columns]
            df = df.dropna(subset=["close"])
            if not df.empty:
                _set_cache(cache_key, df)
                _last_known_df[ticker] = df   # persist for fallback
                return df
    except Exception as e:
        logger.debug("fetch_daily(%s) error: %s", ticker, e)

    # Return last-known if Yahoo is unavailable
    if ticker in _last_known_df:
        logger.debug("fetch_daily(%s): using last-known DataFrame", ticker)
        return _last_known_df[ticker]

    return None


# ── NIFTY index data ───────────────────────────────────────────────────────

def fetch_nifty_daily(period: str = "200d") -> Optional[pd.DataFrame]:
    return fetch_daily("^NSEI", period)


def fetch_banknifty_daily(period: str = "60d") -> Optional[pd.DataFrame]:
    return fetch_daily("^NSEBANK", period)


# ── Helper: safely read fast_info attributes ──────────────────────────────

def _fast_info_get(fi, *attrs) -> Optional[float]:
    """
    Safely read a value from yfinance fast_info (LazyFastInfo object).
    fast_info is NOT a dict in yfinance 1.x – use getattr, not .get().
    """
    for attr in attrs:
        try:
            val = getattr(fi, attr, None)
            if val is not None:
                f = float(val)
                if not (np.isnan(f) or np.isinf(f)) and f != 0:
                    return f
        except Exception:
            continue
    return None


# ── VIX ───────────────────────────────────────────────────────────────────

def fetch_vix() -> Optional[float]:
    cache_key = "vix"
    cached = _cached(cache_key, ttl=60)
    if cached is not None:
        return cached

    vix = None

    # Try fast_info first
    try:
        fi = yf.Ticker("^INDIAVIX").fast_info
        vix = _fast_info_get(fi, "last_price", "lastPrice", "regularMarketPrice")
    except Exception as e:
        logger.debug("fetch_vix fast_info error: %s", e)

    # Fallback: download last close
    if not vix:
        try:
            df = yf.download(
                "^INDIAVIX",
                period="5d",
                interval="1d",
                auto_adjust=True,
                progress=False,
                multi_level_index=False,
            )
            if df is not None and not df.empty:
                v = float(df["Close"].dropna().iloc[-1])
                if v > 0:
                    vix = v
        except Exception as e:
            logger.debug("fetch_vix download fallback error: %s", e)

    if vix and vix > 0:
        _set_cache(cache_key, vix)
        _last_known["^INDIAVIX"] = {"price": vix, "prev_close": vix, "change_pct": 0}
        return vix

    # Last resort: return last-known VIX
    lk = _last_known.get("^INDIAVIX")
    if lk:
        return lk["price"]

    return None


# ── Snapshot (latest quote) ────────────────────────────────────────────────

def fetch_snapshot(ticker: str) -> Optional[Dict[str, Any]]:
    cache_key = f"snap_{ticker}"
    cached = _cached(cache_key, ttl=60)
    if cached is not None:
        return cached

    snap = None

    # Try fast_info first
    try:
        fi    = yf.Ticker(ticker).fast_info
        price = _fast_info_get(fi, "last_price", "lastPrice", "regularMarketPrice")
        prev  = _fast_info_get(fi, "previous_close", "previousClose", "regularMarketPreviousClose")
        if price and price > 0:
            if not prev or prev <= 0:
                prev = price
            chg_pct = round(((price - prev) / prev) * 100, 2) if prev else 0
            snap = {"price": price, "prev_close": prev, "change_pct": chg_pct}
    except Exception as e:
        logger.debug("fetch_snapshot fast_info(%s) error: %s", ticker, e)

    # Fallback: use last bar from daily download
    if snap is None:
        try:
            df = yf.download(
                ticker,
                period="5d",
                interval="1d",
                auto_adjust=True,
                progress=False,
                multi_level_index=False,
            )
            if df is not None and not df.empty:
                closes = df["Close"].dropna()
                if len(closes) >= 1:
                    price = float(closes.iloc[-1])
                    prev  = float(closes.iloc[-2]) if len(closes) >= 2 else price
                    chg_pct = round(((price - prev) / prev) * 100, 2) if prev else 0
                    snap = {"price": price, "prev_close": prev, "change_pct": chg_pct}
        except Exception as e:
            logger.debug("fetch_snapshot download fallback(%s) error: %s", ticker, e)

    if snap is not None:
        _set_cache(cache_key, snap)
        _last_known[ticker] = snap          # persist for future fallback
        return snap

    # Last resort: return last-known price with stale marker
    if ticker in _last_known:
        logger.debug("fetch_snapshot(%s): using last-known price (Yahoo unavailable)", ticker)
        return _last_known[ticker]

    return None


# ── Batch download ─────────────────────────────────────────────────────────

def batch_fetch_daily(
    tickers: List[str],
    period: str = "200d",
    chunk_size: int = 10,          # reduced from 20 to limit concurrent connections
) -> Dict[str, pd.DataFrame]:
    """
    Download daily OHLCV for multiple tickers using yfinance batch mode.
    Returns {ticker: DataFrame} map.
    """
    cache_key = f"batch_{','.join(sorted(tickers[:5]))}_{period}"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    result: Dict[str, pd.DataFrame] = {}
    chunks = [tickers[i:i + chunk_size] for i in range(0, len(tickers), chunk_size)]

    for idx, chunk in enumerate(chunks):
        # Small delay between chunks to avoid connection pool exhaustion
        if idx > 0:
            time.sleep(0.5)
        try:
            raw = yf.download(
                chunk,
                period=period,
                interval="1d",
                auto_adjust=True,
                progress=False,
                group_by="ticker",
                multi_level_index=True,
            )
            if raw is None or raw.empty:
                continue

            for ticker in chunk:
                try:
                    if len(chunk) == 1:
                        df = raw.copy()
                        df.columns = [c.lower() for c in df.columns]
                    else:
                        if ticker not in raw.columns.get_level_values(0):
                            continue
                        df = raw[ticker].copy()
                        df.columns = [c.lower() for c in df.columns]
                    df = df.dropna(subset=["close"])
                    if len(df) >= 20:
                        result[ticker] = df
                except Exception as te:
                    logger.debug("Ticker %s parse error: %s", ticker, te)
        except Exception as e:
            logger.warning("Batch download chunk error: %s", e)
            # Fallback: individual downloads
            for ticker in chunk:
                df = fetch_daily(ticker, period)
                if df is not None:
                    result[ticker] = df

    _set_cache(cache_key, result)
    logger.info("Batch fetched %d/%d tickers", len(result), len(tickers))
    return result


# ── OI / Futures data (simulated from price/volume ratios) ────────────────

def estimate_oi_pattern(df: pd.DataFrame, ticker: str) -> Dict[str, Any]:
    """
    Estimate OI patterns from price + volume data since free APIs
    don't provide real OI. Uses proxy signals.
    """
    result = {
        "oi": None, "oi_change_pct": None, "pcr": None,
        "long_buildup": False, "short_covering": False,
        "short_buildup": False, "long_unwinding": False,
        "oi_increasing": False,
    }
    if df is None or len(df) < 5:
        return result

    try:
        c = df["close"]
        v = df["volume"]

        # Proxy: volume-weighted price change
        price_chg_3d = float(c.iloc[-1] - c.iloc[-4]) if len(c) >= 4 else 0
        vol_chg_3d   = float(v.iloc[-3:].mean() - v.iloc[-6:-3].mean()) if len(v) >= 6 else 0

        price_up = price_chg_3d > 0
        vol_up   = vol_chg_3d > 0

        # Estimate OI from volume patterns
        oi_proxy = float(v.rolling(5).mean().iloc[-1]) * 100 if len(v) >= 5 else 0
        result["oi"] = round(oi_proxy, 0)

        oi_chg = ((float(v.iloc[-1]) - float(v.rolling(5).mean().iloc[-1])) /
                  float(v.rolling(5).mean().iloc[-1])) * 100 if float(v.rolling(5).mean().iloc[-1]) > 0 else 0
        result["oi_change_pct"] = round(oi_chg, 2)
        result["oi_increasing"] = oi_chg > 5

        # OI patterns
        if price_up and vol_up:
            result["long_buildup"] = True
        elif price_up and not vol_up:
            result["short_covering"] = True
        elif not price_up and vol_up:
            result["short_buildup"] = True
        elif not price_up and not vol_up:
            result["long_unwinding"] = True

        # PCR proxy (inverted RSI-like measure)
        from app.scanner.indicators import _safe
        delta = c.diff()
        gain  = delta.clip(lower=0).rolling(14).mean()
        loss  = (-delta.clip(upper=0)).rolling(14).mean()
        rsi_raw = 100 - (100 / (1 + (gain / (loss + 1e-10))))
        rsi_val = float(rsi_raw.iloc[-1]) if len(rsi_raw) >= 14 else 50
        result["pcr"] = round(max(0.2, min(3.0, (100 - rsi_val) / rsi_val * 1.5)), 2)

    except Exception as e:
        logger.debug("OI estimate error for %s: %s", ticker, e)

    return result
