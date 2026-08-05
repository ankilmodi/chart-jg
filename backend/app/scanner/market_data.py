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

def fetch_daily(ticker: str, period: str = "200d", force: bool = False) -> Optional[pd.DataFrame]:
    """Fetch daily OHLCV for a single ticker. Returns lowercase-column DataFrame."""
    cache_key = f"daily_{ticker}_{period}"
    if not force:
        cached = _cached(cache_key)
        if cached is not None:
            return cached

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://finance.yahoo.com'
    }

    for domain in ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']:
        for prd in [period, '30d', '5d']:
            try:
                import requests
                url = f'https://{domain}/v8/finance/chart/{ticker}?interval=1d&range={prd}'
                r = requests.get(url, headers=headers, timeout=6)
                if r.status_code == 200:
                    res = r.json()['chart']['result'][0]
                    timestamps = res.get('timestamp')
                    quote = res['indicators']['quote'][0]
                    if timestamps and quote.get('close'):
                        df = pd.DataFrame({
                            'open': quote.get('open', []),
                            'high': quote.get('high', []),
                            'low': quote.get('low', []),
                            'close': quote.get('close', []),
                            'volume': quote.get('volume', [])
                        }, index=pd.to_datetime(timestamps, unit='s'))
                        df = df.dropna(subset=['close'])
                        if not df.empty:
                            _set_cache(cache_key, df)
                            _last_known_df[ticker] = df
                            return df
            except Exception as e:
                logger.debug("fetch_daily error for %s on %s (%s): %s", ticker, domain, prd, e)

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
                _last_known_df[ticker] = df
                return df
    except Exception as e:
        logger.debug("fetch_daily(%s) yfinance error: %s", ticker, e)

    if ticker in _last_known_df:
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

def fetch_live_index(ticker: str) -> Optional[Dict[str, Any]]:
    """Fetch live index quote (NIFTY 50, NIFTY BANK, INDIA VIX) from official NSE India / Yahoo direct API."""
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
            target = 'NIFTY 50' if ticker == '^NSEI' else ('NIFTY BANK' if ticker == '^NSEBANK' else 'INDIA VIX')
            for item in r.json().get('data', []):
                if item.get('index') == target:
                    last = float(item.get('last', 0))
                    prev = float(item.get('previousClose', 0)) or last
                    chg_pct = float(item.get('percentChange', 0))
                    if last > 0:
                        return {'price': last, 'prev_close': prev, 'change_pct': chg_pct, 'source': 'nse_live'}
    except Exception as e:
        logger.debug("fetch_live_index NSE error for %s: %s", ticker, e)

    # 2. Try Yahoo Direct Chart API
    try:
        url = f'https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d'
        r = requests.get(url, headers=headers, timeout=6)
        if r.status_code == 200:
            meta = r.json()['chart']['result'][0]['meta']
            price = meta.get('regularMarketPrice')
            prev  = meta.get('chartPreviousClose') or price
            if price and price > 0:
                chg_pct = round(((price - prev) / prev) * 100, 2) if prev else 0.0
                return {'price': price, 'prev_close': prev, 'change_pct': chg_pct, 'source': 'yahoo_direct'}
    except Exception as e:
        logger.debug("fetch_live_index Yahoo error for %s: %s", ticker, e)

    return None


def fetch_vix() -> Optional[float]:
    cache_key = "vix"
    cached = _cached(cache_key, ttl=60)
    if cached is not None:
        return cached

    # Try live index fetcher first
    live = fetch_live_index("^INDIAVIX")
    if live and live["price"] > 0:
        vix = live["price"]
        _set_cache(cache_key, vix)
        _last_known["^INDIAVIX"] = live
        return vix

    # Fallback to yfinance fast_info / download
    try:
        fi = yf.Ticker("^INDIAVIX").fast_info
        vix = _fast_info_get(fi, "last_price", "lastPrice", "regularMarketPrice")
        if vix and vix > 0:
            _set_cache(cache_key, vix)
            return vix
    except Exception:
        pass

    return 12.15


# ── Snapshot (latest quote) ────────────────────────────────────────────────

def fetch_snapshot(ticker: str) -> Optional[Dict[str, Any]]:
    cache_key = f"snap_{ticker}"
    cached = _cached(cache_key, ttl=60)
    if cached is not None:
        return cached

    # Use live index fetcher for indices (^NSEI, ^NSEBANK, ^INDIAVIX)
    if ticker in ("^NSEI", "^NSEBANK", "^INDIAVIX"):
        live = fetch_live_index(ticker)
        if live:
            _set_cache(cache_key, live)
            _last_known[ticker] = live
            return live

    snap = None
    # Try fast_info for individual stocks
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

    if snap is not None:
        _set_cache(cache_key, snap)
        _last_known[ticker] = snap
        return snap

    if ticker in _last_known:
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
