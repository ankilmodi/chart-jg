"""
Technical Indicators Engine.
Computes all indicators from OHLCV DataFrame using pandas_ta.
"""
import logging
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd

try:
    import pandas_ta as ta
    HAS_TA = True
except ImportError:
    HAS_TA = False

logger = logging.getLogger(__name__)


def _safe(val) -> Optional[float]:
    """Return float or None, never NaN."""
    if val is None:
        return None
    try:
        v = float(val)
        return None if (np.isnan(v) or np.isinf(v)) else round(v, 4)
    except Exception:
        return None


def compute_all(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute all technical indicators from OHLCV DataFrame.
    DataFrame must have columns: open, high, low, close, volume (lowercase).
    Returns a flat dict of indicator values.
    """
    if df is None or len(df) < 20:
        return {}

    # Ensure lowercase columns
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]

    # Require minimum columns
    required = {"open", "high", "low", "close", "volume"}
    if not required.issubset(set(df.columns)):
        return {}

    ind: Dict[str, Any] = {}
    c = df["close"]
    h = df["high"]
    l = df["low"]
    o = df["open"]
    v = df["volume"]

    # ── Price basics ──────────────────────────────────────────────────────
    ind["price"] = _safe(c.iloc[-1])
    ind["open"]  = _safe(o.iloc[-1])
    ind["high"]  = _safe(h.iloc[-1])
    ind["low"]   = _safe(l.iloc[-1])
    ind["close"] = _safe(c.iloc[-1])
    ind["prev_close"] = _safe(c.iloc[-2]) if len(c) >= 2 else None
    if ind["prev_close"] and ind["price"]:
        ind["change"]     = _safe(ind["price"] - ind["prev_close"])
        ind["change_pct"] = _safe(((ind["price"] - ind["prev_close"]) / ind["prev_close"]) * 100)

    # ── EMA ──────────────────────────────────────────────────────────────
    for period in [9, 20, 50, 100, 200]:
        key = f"ema{period}"
        if len(c) >= period:
            ema = c.ewm(span=period, adjust=False).mean()
            ind[key] = _safe(ema.iloc[-1])

    # ── SMA ──────────────────────────────────────────────────────────────
    for period in [20, 50, 200]:
        if len(c) >= period:
            ind[f"sma{period}"] = _safe(c.rolling(period).mean().iloc[-1])

    # ── Golden/Death Cross ────────────────────────────────────────────────
    if ind.get("ema50") and ind.get("ema200"):
        ema50_series  = c.ewm(span=50,  adjust=False).mean()
        ema200_series = c.ewm(span=200, adjust=False).mean()
        if len(ema50_series) >= 2:
            prev_diff = float(ema50_series.iloc[-2]) - float(ema200_series.iloc[-2])
            curr_diff = float(ema50_series.iloc[-1]) - float(ema200_series.iloc[-1])
            if prev_diff < 0 and curr_diff >= 0:
                ind["golden_cross"] = True
            elif prev_diff > 0 and curr_diff <= 0:
                ind["death_cross"] = True
            else:
                ind["golden_cross"] = False
                ind["death_cross"]  = False

    # ── VWAP ─────────────────────────────────────────────────────────────
    try:
        typical_price = (h + l + c) / 3
        tpv = typical_price * v
        vwap_val = tpv.cumsum() / v.cumsum()
        ind["vwap"] = _safe(vwap_val.iloc[-1])
    except Exception:
        pass

    # ── RSI ──────────────────────────────────────────────────────────────
    try:
        if len(c) >= 15:
            delta = c.diff()
            gain  = delta.clip(lower=0).rolling(14).mean()
            loss  = (-delta.clip(upper=0)).rolling(14).mean()
            rs    = gain / (loss + 1e-10)
            rsi   = 100 - (100 / (1 + rs))
            ind["rsi"] = _safe(rsi.iloc[-1])
    except Exception:
        pass

    # ── MACD ─────────────────────────────────────────────────────────────
    try:
        if len(c) >= 26:
            ema12 = c.ewm(span=12, adjust=False).mean()
            ema26 = c.ewm(span=26, adjust=False).mean()
            macd_line   = ema12 - ema26
            signal_line = macd_line.ewm(span=9, adjust=False).mean()
            histogram   = macd_line - signal_line
            ind["macd"]             = _safe(macd_line.iloc[-1])
            ind["macd_signal_line"] = _safe(signal_line.iloc[-1])
            ind["macd_hist"]        = _safe(histogram.iloc[-1])
            # Cross detection
            if len(macd_line) >= 2:
                prev_diff = float(macd_line.iloc[-2]) - float(signal_line.iloc[-2])
                curr_diff = float(macd_line.iloc[-1]) - float(signal_line.iloc[-1])
                if prev_diff < 0 and curr_diff >= 0:
                    ind["macd_cross"] = "bullish"
                elif prev_diff > 0 and curr_diff <= 0:
                    ind["macd_cross"] = "bearish"
                else:
                    ind["macd_cross"] = "bullish" if curr_diff > 0 else "bearish"
    except Exception:
        pass

    # ── ADX ──────────────────────────────────────────────────────────────
    try:
        if len(df) >= 20:
            period = 14
            tr1 = h - l
            tr2 = (h - c.shift(1)).abs()
            tr3 = (l - c.shift(1)).abs()
            tr  = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            dm_pos = h.diff().clip(lower=0)
            dm_neg = (-l.diff()).clip(lower=0)
            # Wilder smoothing
            atr14 = tr.rolling(period).mean()
            diplus_raw  = (dm_pos.rolling(period).mean() / (atr14 + 1e-10)) * 100
            diminus_raw = (dm_neg.rolling(period).mean() / (atr14 + 1e-10)) * 100
            dx  = ((diplus_raw - diminus_raw).abs() / (diplus_raw + diminus_raw + 1e-10)) * 100
            adx = dx.rolling(period).mean()
            ind["adx"]       = _safe(adx.iloc[-1])
            ind["adx_plus"]  = _safe(diplus_raw.iloc[-1])
            ind["adx_minus"] = _safe(diminus_raw.iloc[-1])
    except Exception:
        pass

    # ── ATR ──────────────────────────────────────────────────────────────
    try:
        if len(df) >= 15:
            tr1 = h - l
            tr2 = (h - c.shift(1)).abs()
            tr3 = (l - c.shift(1)).abs()
            tr  = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = tr.rolling(14).mean()
            ind["atr"] = _safe(atr.iloc[-1])
    except Exception:
        pass

    # ── Bollinger Bands ───────────────────────────────────────────────────
    try:
        if len(c) >= 20:
            sma20  = c.rolling(20).mean()
            std20  = c.rolling(20).std()
            ind["bb_upper"]  = _safe((sma20 + 2 * std20).iloc[-1])
            ind["bb_middle"] = _safe(sma20.iloc[-1])
            ind["bb_lower"]  = _safe((sma20 - 2 * std20).iloc[-1])
    except Exception:
        pass

    # ── Supertrend ────────────────────────────────────────────────────────
    try:
        if len(df) >= 20:
            atr_mult = 3.0
            atr_period = 10
            tr1 = h - l
            tr2 = (h - c.shift(1)).abs()
            tr3 = (l - c.shift(1)).abs()
            tr  = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr_st = tr.rolling(atr_period).mean()
            hl2    = (h + l) / 2
            upper_band = hl2 + atr_mult * atr_st
            lower_band = hl2 - atr_mult * atr_st

            supertrend = pd.Series(index=df.index, dtype=float)
            direction  = pd.Series(index=df.index, dtype=float)

            for i in range(1, len(df)):
                prev_upper = upper_band.iloc[i - 1]
                prev_lower = lower_band.iloc[i - 1]
                prev_close = c.iloc[i - 1]

                upper_band.iloc[i] = upper_band.iloc[i] if upper_band.iloc[i] < prev_upper or prev_close > prev_upper else prev_upper
                lower_band.iloc[i] = lower_band.iloc[i] if lower_band.iloc[i] > prev_lower or prev_close < prev_lower else prev_lower

                if i == 1:
                    direction.iloc[i] = 1
                elif supertrend.iloc[i - 1] == prev_upper:
                    direction.iloc[i] = -1 if c.iloc[i] > upper_band.iloc[i] else 1
                else:
                    direction.iloc[i] = 1 if c.iloc[i] < lower_band.iloc[i] else -1

                supertrend.iloc[i] = lower_band.iloc[i] if direction.iloc[i] == -1 else upper_band.iloc[i]

            ind["supertrend"]     = _safe(supertrend.iloc[-1])
            ind["supertrend_dir"] = "buy" if direction.iloc[-1] == -1 else "sell"
    except Exception:
        pass

    # ── Volume analysis ───────────────────────────────────────────────────
    try:
        if len(v) >= 20:
            avg_vol = v.rolling(20).mean()
            ind["avg_volume_20d"] = _safe(avg_vol.iloc[-1])
            if avg_vol.iloc[-1] > 0:
                ind["vol_ratio"] = _safe(float(v.iloc[-1]) / float(avg_vol.iloc[-1]))
        ind["volume"] = int(v.iloc[-1]) if not pd.isna(v.iloc[-1]) else None

        # Volume trend (3 days increasing)
        if len(v) >= 4:
            vol_increasing = all(v.iloc[-i] > v.iloc[-i - 1] for i in range(1, 4))
            ind["volume_increasing_3d"] = vol_increasing
    except Exception:
        pass

    # ── 52-week high/low ──────────────────────────────────────────────────
    try:
        if len(c) >= 52:
            w52_high = h.tail(252).max()
            w52_low  = l.tail(252).min()
            ind["week52_high"] = _safe(w52_high)
            ind["week52_low"]  = _safe(w52_low)
            price = ind.get("price")
            if price and w52_high:
                ind["week52_high_pct"] = _safe(((price - float(w52_high)) / float(w52_high)) * 100)
            if price and w52_low:
                ind["week52_low_pct"]  = _safe(((price - float(w52_low)) / float(w52_low)) * 100)
    except Exception:
        pass

    # ── Price action patterns ─────────────────────────────────────────────
    try:
        # Consecutive green candles
        green_count = 0
        for i in range(1, min(11, len(c))):
            if c.iloc[-i] > o.iloc[-i]:
                green_count += 1
            else:
                break
        ind["consecutive_green"] = green_count

        # Higher Highs & Higher Lows (last 5 candles)
        if len(df) >= 6:
            highs = h.tail(5).values
            lows  = l.tail(5).values
            ind["higher_highs"] = bool(highs[-1] > highs[-2] > highs[-3])
            ind["higher_lows"]  = bool(lows[-1] > lows[-2] > lows[-3])

        # Bullish engulfing
        if len(df) >= 2:
            prev_open, prev_close = float(o.iloc[-2]), float(c.iloc[-2])
            curr_open, curr_close = float(o.iloc[-1]), float(c.iloc[-1])
            ind["bullish_engulfing"] = (
                prev_close < prev_open and  # prev red
                curr_close > curr_open and  # curr green
                curr_open < prev_close and
                curr_close > prev_open
            )

        # Gap up
        if ind.get("open") and ind.get("prev_close") and ind["prev_close"]:
            gap_pct = ((ind["open"] - ind["prev_close"]) / ind["prev_close"]) * 100
            ind["gap_up_pct"] = _safe(gap_pct)
    except Exception:
        pass

    # ── Breakout detection ────────────────────────────────────────────────
    try:
        price = ind.get("price")
        if price:
            for days in [20, 50, 100, 200]:
                if len(h) >= days:
                    period_high = float(h.tail(days).max())
                    if price >= period_high * 0.999:
                        ind[f"breakout_{days}d"] = True
                    else:
                        ind[f"breakout_{days}d"] = False

            # Resistance breakout (simplified: price above 20d high)
            if len(h) >= 20:
                ind["prev_week_high"] = _safe(float(h.tail(20).max()))
    except Exception:
        pass

    # ── Trend classification ──────────────────────────────────────────────
    try:
        price = ind.get("price")
        ema20  = ind.get("ema20")
        ema50  = ind.get("ema50")
        ema200 = ind.get("ema200")
        adx    = ind.get("adx")

        if price and ema20 and ema50 and ema200:
            above_all = price > ema20 > ema50 > ema200
            above_50  = price > ema50
            below_all = price < ema20 and price < ema50 and price < ema200
            strong_adx = adx and adx > 25

            if above_all and strong_adx:
                ind["trend"] = "Strong Uptrend"
            elif above_50:
                ind["trend"] = "Uptrend"
            elif below_all and strong_adx:
                ind["trend"] = "Strong Downtrend"
            elif price < ema50:
                ind["trend"] = "Weak Downtrend"
            else:
                ind["trend"] = "Sideways"
    except Exception:
        pass

    # ── Momentum classification ───────────────────────────────────────────
    try:
        rsi  = ind.get("rsi")
        macd_hist = ind.get("macd_hist")
        adx  = ind.get("adx")
        if rsi and macd_hist is not None and adx:
            if rsi > 60 and macd_hist > 0 and adx > 25:
                ind["momentum"] = "Strong"
            elif rsi > 50 and macd_hist > 0:
                ind["momentum"] = "Increasing"
            elif rsi < 50 and macd_hist < 0:
                ind["momentum"] = "Loss"
            else:
                ind["momentum"] = "Weak"
    except Exception:
        pass

    # ── Support / Resistance ──────────────────────────────────────────────
    try:
        if len(df) >= 20:
            recent_lows  = l.tail(20)
            recent_highs = h.tail(20)
            ind["support"]    = _safe(float(recent_lows.nsmallest(3).mean()))
            ind["resistance"] = _safe(float(recent_highs.nlargest(3).mean()))
    except Exception:
        pass


    # ── Multi-day price strength ──────────────────────────────────────────
    try:
        # Count consecutive bullish days (close > prev_close, higher high, higher low)
        bullish_days = 0
        for i in range(1, min(11, len(df))):
            curr_c = c.iloc[-i]
            prev_c = c.iloc[-i-1] if (len(c) > i) else None
            curr_h = h.iloc[-i]
            prev_h = h.iloc[-i-1] if (len(h) > i) else None
            curr_l = l.iloc[-i]
            prev_l = l.iloc[-i-1] if (len(l) > i) else None
            
            if prev_c and prev_h and prev_l:
                is_bullish = (curr_c > prev_c and curr_h > prev_h and curr_l > prev_l)
                if is_bullish:
                    bullish_days += 1
                else:
                    break
        ind["multi_day_strength"] = bullish_days
    except Exception:
        pass

    # ── Continuous volume growth ──────────────────────────────────────────
    try:
        if len(v) >= 6:
            # Check if volume is increasing each day
            vol_increasing_count = 0
            avg_20d = v.rolling(20).mean() if len(v) >= 20 else None
            
            for i in range(1, min(8, len(v))):
                curr_vol = v.iloc[-i]
                prev_vol = v.iloc[-i-1]
                above_avg = True
                if avg_20d is not None and not pd.isna(avg_20d.iloc[-i]):
                    above_avg = curr_vol > avg_20d.iloc[-i]
                
                if curr_vol > prev_vol and above_avg:
                    vol_increasing_count += 1
                else:
                    break
            
            ind["continuous_volume_growth"] = vol_increasing_count
            ind["volume_trend"] = "Increasing" if vol_increasing_count >= 3 else "Flat"
    except Exception:
        pass

    # ── Volume vs multiple averages ───────────────────────────────────────
    try:
        if len(v) >= 50:
            curr_vol = float(v.iloc[-1])
            vol_5d   = float(v.rolling(5).mean().iloc[-1])
            vol_10d  = float(v.rolling(10).mean().iloc[-1])
            vol_20d  = float(v.rolling(20).mean().iloc[-1])
            vol_50d  = float(v.rolling(50).mean().iloc[-1])
            
            ind["vol_vs_5d"]  = round(curr_vol / vol_5d, 2) if vol_5d > 0 else None
            ind["vol_vs_10d"] = round(curr_vol / vol_10d, 2) if vol_10d > 0 else None
            ind["vol_vs_20d"] = round(curr_vol / vol_20d, 2) if vol_20d > 0 else None
            ind["vol_vs_50d"] = round(curr_vol / vol_50d, 2) if vol_50d > 0 else None
            
            # Check if current volume is highest in last 20 days
            if len(v) >= 20:
                ind["is_highest_volume_20d"] = bool(curr_vol >= float(v.tail(20).max()))
    except Exception:
        pass

    # ── Smart money detection ─────────────────────────────────────────────
    try:
        price_up = ind.get("change_pct", 0) > 0
        vol_up = ind.get("vol_ratio", 0) > 1.2
        vwap_hold = ind.get("vwap") and ind.get("price") and ind["price"] > ind["vwap"]
        large_green = ind.get("consecutive_green", 0) >= 1
        
        smart_money_score = 0
        if price_up: smart_money_score += 1
        if vol_up: smart_money_score += 1
        if vwap_hold: smart_money_score += 1
        if large_green: smart_money_score += 1
        
        if smart_money_score >= 4:
            ind["smart_money"] = "Strong"
        elif smart_money_score >= 3:
            ind["smart_money"] = "Moderate"
        else:
            ind["smart_money"] = "Weak"
    except Exception:
        pass

    # ── Price above important levels ──────────────────────────────────────
    try:
        price = ind.get("price")
        if price:
            levels_above = 0
            total_levels = 0
            
            for key in ["ema20", "ema50", "ema100", "ema200", "vwap"]:
                level = ind.get(key)
                if level:
                    total_levels += 1
                    if price > level:
                        levels_above += 1
            
            # Previous day high
            if len(h) >= 2:
                prev_high = float(h.iloc[-2])
                total_levels += 1
                if price > prev_high:
                    levels_above += 1
                ind["prev_day_high"] = _safe(prev_high)
            
            # 20-day high, 50-day high, 100-day high
            for days in [20, 50, 100]:
                if len(h) >= days:
                    period_high = float(h.tail(days).max())
                    total_levels += 1
                    if price > period_high:
                        levels_above += 1
                    ind[f"{days}d_high"] = _safe(period_high)
            
            ind["levels_above_count"] = levels_above
            ind["levels_total"] = total_levels
            ind["levels_above_pct"] = round((levels_above / total_levels * 100) if total_levels > 0 else 0, 1)
    except Exception:
        pass

    # ── Advanced candle patterns ──────────────────────────────────────────
    try:
        candle_patterns = []
        
        if len(df) >= 3:
            # Three white soldiers
            if all(c.iloc[-i] > o.iloc[-i] for i in range(1, 4)):
                if all(c.iloc[-i] > c.iloc[-i-1] for i in range(1, 3)):
                    candle_patterns.append("Three White Soldiers")
                    ind["three_white_soldiers"] = True
            
            # Morning Star (simplified)
            if (c.iloc[-3] < o.iloc[-3] and  # first red
                abs(c.iloc[-2] - o.iloc[-2]) < (h.iloc[-2] - l.iloc[-2]) * 0.3 and  # small body
                c.iloc[-1] > o.iloc[-1]):  # last green
                candle_patterns.append("Morning Star")
                ind["morning_star"] = True
        
        if len(df) >= 1:
            # Marubozu (full body, no wicks)
            body = abs(c.iloc[-1] - o.iloc[-1])
            full_range = h.iloc[-1] - l.iloc[-1]
            if body / full_range > 0.95 and c.iloc[-1] > o.iloc[-1]:
                candle_patterns.append("Marubozu")
                ind["marubozu"] = True
            
            # Hammer
            body = abs(c.iloc[-1] - o.iloc[-1])
            lower_wick = min(o.iloc[-1], c.iloc[-1]) - l.iloc[-1]
            upper_wick = h.iloc[-1] - max(o.iloc[-1], c.iloc[-1])
            if lower_wick > body * 2 and upper_wick < body * 0.3:
                candle_patterns.append("Hammer")
                ind["hammer"] = True
        
        ind["bullish_patterns"] = candle_patterns
        ind["bullish_pattern_count"] = len(candle_patterns)
    except Exception:
        pass

    # ── EMA slopes ────────────────────────────────────────────────────────
    try:
        if len(c) >= 25:
            for period in [20, 50, 200]:
                if len(c) >= period + 5:
                    ema_series = c.ewm(span=period, adjust=False).mean()
                    curr_ema = float(ema_series.iloc[-1])
                    prev_ema = float(ema_series.iloc[-6])  # 5 days ago
                    slope = ((curr_ema - prev_ema) / prev_ema) * 100
                    ind[f"ema{period}_slope"] = round(slope, 2)
    except Exception:
        pass

    # ── Weekly OHLCV data ─────────────────────────────────────────────────
    try:
        if len(df) >= 20:
            # Resample daily to weekly
            df_w = df.resample("W", on=df.index if hasattr(df.index, 'freq') else None)
            # Safe resample using index
            if hasattr(df.index, 'to_timestamp') or isinstance(df.index, pd.DatetimeIndex):
                weekly = df.resample("W").agg({
                    "open": "first", "high": "max",
                    "low": "min", "close": "last", "volume": "sum"
                }).dropna()
                if len(weekly) >= 5:
                    wc = weekly["close"]
                    wv = weekly["volume"]
                    wh = weekly["high"]
                    
                    # Weekly EMAs
                    ind["weekly_ema9"]  = _safe(wc.ewm(span=9, adjust=False).mean().iloc[-1])
                    ind["weekly_ema20"] = _safe(wc.ewm(span=20, adjust=False).mean().iloc[-1]) if len(wc) >= 20 else None
                    
                    # Weekly RSI
                    if len(wc) >= 14:
                        w_delta = wc.diff()
                        w_gain = w_delta.clip(lower=0).rolling(14).mean()
                        w_loss = (-w_delta.clip(upper=0)).rolling(14).mean()
                        w_rs   = w_gain / (w_loss + 1e-10)
                        ind["weekly_rsi"] = _safe((100 - (100 / (1 + w_rs))).iloc[-1])
                    
                    # Weekly MACD
                    if len(wc) >= 26:
                        w_macd = wc.ewm(span=12, adjust=False).mean() - wc.ewm(span=26, adjust=False).mean()
                        w_sig  = w_macd.ewm(span=9, adjust=False).mean()
                        ind["weekly_macd"]      = _safe(w_macd.iloc[-1])
                        ind["weekly_macd_hist"] = _safe((w_macd - w_sig).iloc[-1])
                        ind["weekly_macd_bull"] = bool(float(w_macd.iloc[-1]) > float(w_sig.iloc[-1]))
                    
                    # Weekly breakout (price above last week's high)
                    curr_price = ind.get("price") or 0
                    last_week_high = float(wh.iloc[-2]) if len(wh) >= 2 else 0
                    ind["weekly_breakout"] = bool(curr_price > last_week_high)
                    ind["weekly_high"]     = _safe(last_week_high)
                    
                    # Weekly volume vs average
                    if len(wv) >= 4:
                        wv_avg = float(wv.rolling(4).mean().iloc[-1])
                        ind["weekly_vol_ratio"] = _safe(float(wv.iloc[-1]) / wv_avg if wv_avg > 0 else 0)
    except Exception:
        pass

    # ── Breakout validity check ───────────────────────────────────────────
    try:
        is_breakout_valid = False
        fake_breakout = False
        
        price       = ind.get("price")
        resistance  = ind.get("resistance")
        vol_ratio   = ind.get("vol_ratio", 0) or 0
        rsi_val     = ind.get("rsi", 0) or 0
        macd_cross  = ind.get("macd_cross")
        adx_val     = ind.get("adx", 0) or 0
        oi_inc      = ind.get("oi_increasing", False)
        
        if price and resistance:
            price_above_res = price > resistance
            volume_confirm  = vol_ratio >= 2.0
            rsi_confirm     = rsi_val >= 55
            macd_confirm    = macd_cross == "bullish" or (ind.get("macd_hist", 0) or 0) > 0
            adx_confirm     = adx_val >= 25
            
            confirmation_count = sum([price_above_res, volume_confirm, rsi_confirm, macd_confirm, adx_confirm])
            
            if price_above_res and volume_confirm and rsi_confirm and macd_confirm and adx_confirm:
                is_breakout_valid = True
            elif price_above_res and confirmation_count <= 2:
                fake_breakout = True
        
        ind["breakout_valid"] = is_breakout_valid
        ind["fake_breakout"]  = fake_breakout
    except Exception:
        pass


    return ind


def compute_relative_strength(stock_returns: pd.Series, nifty_returns: pd.Series, period: int = 20) -> Optional[float]:
    """Compute RS of stock vs Nifty over last N periods."""
    try:
        if len(stock_returns) < period or len(nifty_returns) < period:
            return None
        stock_r = float(stock_returns.tail(period).mean())
        nifty_r = float(nifty_returns.tail(period).mean())
        if nifty_r == 0:
            return None
        return round(stock_r / nifty_r, 4)
    except Exception:
        return None
