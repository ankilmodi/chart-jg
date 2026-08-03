import time
import logging
import numpy as np
import pandas as pd
import yfinance as yf
from symbols import NIFTY_50_SYMBOLS, NIFTY_FUTURES_SYMBOLS, NIFTY_ALL_SHARE_SYMBOLS, COMPANY_NAMES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nifty_tracker")

CACHE_TTL_SECONDS = 8
_QUOTE_CACHE = {}
_INDEX_CACHE = {"timestamp": 0, "data": {}}

def calculate_rsi(prices, period=14):
    """Calculate Relative Strength Index (RSI)"""
    if len(prices) < period + 1:
        return 50.0
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)
    
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(float(100.0 - (100.0 / (1.0 + rs))), 1)

def calculate_ema(series, span):
    """Calculate Exponential Moving Average (EMA)"""
    if len(series) < span:
        return float(series.mean())
    return float(series.ewm(span=span, adjust=False).mean().iloc[-1])

def fetch_market_indices():
    """Fetch Nifty 50 and Nifty Bank benchmark index data"""
    global _INDEX_CACHE
    now = time.time()
    if now - _INDEX_CACHE["timestamp"] < CACHE_TTL_SECONDS and _INDEX_CACHE["data"]:
        return _INDEX_CACHE["data"]

    try:
        tickers = ["^NSEI", "^NSEBANK"]
        df = yf.download(tickers, period="5d", interval="1d", progress=False, threads=True)
        
        indices_data = {}
        for ticker, name in [("^NSEI", "NIFTY 50"), ("^NSEBANK", "NIFTY BANK")]:
            try:
                if isinstance(df.columns, pd.MultiIndex):
                    close_series = df["Close"][ticker].dropna()
                else:
                    close_series = df["Close"].dropna()
                
                if len(close_series) >= 2:
                    current = float(close_series.iloc[-1])
                    prev = float(close_series.iloc[-2])
                    change = current - prev
                    p_change = (change / prev) * 100
                    indices_data[name] = {
                        "symbol": ticker,
                        "name": name,
                        "price": round(current, 2),
                        "change": round(change, 2),
                        "pChange": round(p_change, 2),
                        "isPositive": change >= 0
                    }
            except Exception as e:
                logger.warning(f"Error parsing index {ticker}: {e}")
                
        _INDEX_CACHE = {"timestamp": now, "data": indices_data}
        return indices_data
    except Exception as e:
        logger.error(f"Error fetching market indices: {e}")
        return _INDEX_CACHE.get("data", {})

def fetch_batch_quotes(symbols):
    """Fetch batch stock quotes and compute technical 100-point Buying Strength Score"""
    try:
        # Download 60 days history to accurately compute EMA 20, EMA 50 & RSI 14
        df = yf.download(symbols, period="60d", interval="1d", progress=False, threads=True)
        
        results = []
        is_multi = isinstance(df.columns, pd.MultiIndex)
        
        for sym in symbols:
            try:
                if is_multi:
                    close_s = df["Close"][sym].dropna()
                    high_s = df["High"][sym].dropna()
                    low_s = df["Low"][sym].dropna()
                    vol_s = df["Volume"][sym].dropna()
                    open_s = df["Open"][sym].dropna()
                else:
                    close_s = df["Close"].dropna()
                    high_s = df["High"].dropna()
                    low_s = df["Low"].dropna()
                    vol_s = df["Volume"].dropna()
                    open_s = df["Open"].dropna()

                if len(close_s) < 5:
                    continue

                curr_close = float(close_s.iloc[-1])
                prev_close = float(close_s.iloc[-2])
                curr_open = float(open_s.iloc[-1]) if len(open_s) > 0 else curr_close
                curr_high = float(high_s.iloc[-1]) if len(high_s) > 0 else curr_close
                curr_low = float(low_s.iloc[-1]) if len(low_s) > 0 else curr_close
                curr_vol = int(vol_s.iloc[-1]) if len(vol_s) > 0 else 0
                avg_vol = float(vol_s.mean()) if len(vol_s) > 0 else 1.0

                change = curr_close - prev_close
                p_change = (change / prev_close) * 100 if prev_close else 0.0

                # 1. Technical Indicators Calculation
                rsi = calculate_rsi(close_s.values, period=14)
                ema20 = calculate_ema(close_s, span=20)
                ema50 = calculate_ema(close_s, span=50)

                # 2. Comprehensive 100-Point Best Buyers Formula

                # A. RSI Momentum Score (25 points max)
                if 50 <= rsi <= 70:
                    rsi_score = 25.0  # Perfect bullish momentum zone
                elif 40 <= rsi < 50:
                    rsi_score = 18.0
                elif 70 < rsi <= 80:
                    rsi_score = 20.0  # Strong uptrend, near overbought
                elif rsi > 80:
                    rsi_score = 12.0  # Extreme overbought
                else:
                    rsi_score = max(0.0, (rsi / 40.0) * 15.0)

                # B. EMA Trend Alignment Score (25 points max)
                ema_score = 0.0
                if curr_close > ema20:
                    ema_score += 12.5  # Price above EMA 20
                if ema20 > ema50:
                    ema_score += 12.5  # EMA 20 > EMA 50 Golden trend alignment

                # C. Volume Surge & Liquidity Score (25 points max)
                vol_ratio = curr_vol / (avg_vol + 1.0)
                volume_score = min(25.0, round(vol_ratio * 16.0, 1))

                # D. Delivery & Intraday Close Strength Score (25 points max)
                range_span = curr_high - curr_low
                range_pos = (curr_close - curr_low) / range_span if range_span > 0 else 0.5
                range_score = round(range_pos * 25.0, 1)

                # Total Best Buyers Score out of 100
                total_buy_score = int(min(99, max(1, round(rsi_score + ema_score + volume_score + range_score))))

                # Estimated Bid / Ask Spread
                spread = max(0.05, round(curr_close * 0.0005, 2))
                bid = round(curr_close - spread / 2, 2)
                ask = round(curr_close + spread / 2, 2)

                ticker_clean = sym.replace(".NS", "")
                company_name = COMPANY_NAMES.get(sym, ticker_clean)

                results.append({
                    "symbol": sym,
                    "ticker": ticker_clean,
                    "name": company_name,
                    "price": round(curr_close, 2),
                    "open": round(curr_open, 2),
                    "high": round(curr_high, 2),
                    "low": round(curr_low, 2),
                    "prevClose": round(prev_close, 2),
                    "change": round(change, 2),
                    "pChange": round(p_change, 2),
                    "volume": curr_vol,
                    "avgVolume": int(avg_vol),
                    "volRatio": round(vol_ratio, 2),
                    "rsi": rsi,
                    "ema20": round(ema20, 2),
                    "ema50": round(ema50, 2),
                    "buySentiment": total_buy_score,
                    "scoreBreakdown": {
                        "rsiScore": round(rsi_score, 1),
                        "emaScore": round(ema_score, 1),
                        "volumeScore": round(volume_score, 1),
                        "rangeScore": round(range_score, 1)
                    },
                    "bid": bid,
                    "ask": ask,
                    "isPositive": change >= 0
                })
            except Exception as item_err:
                continue

        return results
    except Exception as e:
        logger.error(f"Error in batch quotes download: {e}")
        return []

def get_stocks_data(tab: str = "nifty50"):
    """Get stocks list for a tab with caching"""
    global _QUOTE_CACHE
    now = time.time()
    tab_key = tab.lower()

    if tab_key in _QUOTE_CACHE and (now - _QUOTE_CACHE[tab_key]["timestamp"] < CACHE_TTL_SECONDS):
        return _QUOTE_CACHE[tab_key]["data"]

    if tab_key == "nifty50":
        symbols = NIFTY_50_SYMBOLS
    elif tab_key == "futures":
        symbols = NIFTY_FUTURES_SYMBOLS
    elif tab_key == "all":
        symbols = NIFTY_ALL_SHARE_SYMBOLS
    else:
        symbols = NIFTY_50_SYMBOLS

    stocks = fetch_batch_quotes(symbols)
    stocks_sorted = sorted(stocks, key=lambda x: abs(x["pChange"]), reverse=True)
    
    _QUOTE_CACHE[tab_key] = {"timestamp": now, "data": stocks_sorted}
    return stocks_sorted

def get_top_performers(tab: str = "nifty50"):
    """Extract Top Gainers, Top Losers, and Best Buyers using 100-point formula"""
    stocks = get_stocks_data(tab)
    
    if not stocks:
        return {"topGainers": [], "topLosers": [], "bestBuyers": []}

    gainers = [s for s in stocks if s["pChange"] > 0]
    top_gainers = sorted(gainers, key=lambda x: x["pChange"], reverse=True)[:5]
    
    losers = [s for s in stocks if s["pChange"] < 0]
    top_losers = sorted(losers, key=lambda x: x["pChange"])[:5]

    # Best Buyers: Ranked by 100-point Technical Score (RSI + EMA 20/50 + Vol + Intraday Close Range)
    best_buyers = sorted(stocks, key=lambda x: x["buySentiment"], reverse=True)[:5]

    return {
        "topGainers": top_gainers,
        "topLosers": top_losers,
        "bestBuyers": best_buyers
    }

def get_stock_chart(symbol: str):
    """Fetch intraday price chart for modal detail view"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5d", interval="15m")
        if hist.empty:
            hist = ticker.history(period="1mo", interval="1d")
            
        chart_points = []
        for idx, row in hist.iterrows():
            time_str = idx.strftime("%d %b %H:%M") if hasattr(idx, 'strftime') else str(idx)
            chart_points.append({
                "time": time_str,
                "price": round(float(row["Close"]), 2),
                "volume": int(row["Volume"])
            })
        return chart_points
    except Exception as e:
        logger.error(f"Error fetching chart for {symbol}: {e}")
        return []
