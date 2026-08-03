import numpy as np
import pandas as pd

class EMAAlignmentIndicator:
    """Calculates EMA 9, 20, 50, 100, 200 and checks EMA alignment (EMA9 > EMA20 > EMA50 > EMA100 > EMA200)"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        close = df['Close']
        ema9 = close.ewm(span=9, adjust=False).mean().iloc[-1]
        ema20 = close.ewm(span=20, adjust=False).mean().iloc[-1]
        ema50 = close.ewm(span=50, adjust=False).mean().iloc[-1]
        ema100 = close.ewm(span=100, adjust=False).mean().iloc[-1]
        ema200 = close.ewm(span=200, adjust=False).mean().iloc[-1]
        
        is_aligned = (ema9 > ema20) and (ema20 > ema50) and (ema50 > ema100) and (ema100 > ema200)
        curr_price = close.iloc[-1]
        is_above_ema20 = curr_price > ema20
        
        # Scoring out of 10 points for alignment & position
        score = 0.0
        if is_aligned:
            score += 6.0
        elif ema9 > ema20 > ema50:
            score += 4.0
        if is_above_ema20:
            score += 4.0
            
        return {
            "ema9": round(float(ema9), 2),
            "ema20": round(float(ema20), 2),
            "ema50": round(float(ema50), 2),
            "ema100": round(float(ema100), 2),
            "ema200": round(float(ema200), 2),
            "isAligned": bool(is_aligned),
            "isAboveEMA20": bool(is_above_ema20),
            "score": round(score, 1)
        }

class VWAPIndicator:
    """Calculates Volume Weighted Average Price (VWAP) and checks Price > VWAP"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        volume = df['Volume']
        
        typical_price = (high + low + close) / 3.0
        vwap = (typical_price * volume).cumsum() / (volume.cumsum() + 1e-6)
        curr_vwap = vwap.iloc[-1]
        curr_price = close.iloc[-1]
        
        is_above = curr_price > curr_vwap
        score = 4.0 if is_above else 0.0
        
        return {
            "vwap": round(float(curr_vwap), 2),
            "isAboveVWAP": bool(is_above),
            "score": score
        }

class SuperTrendIndicator:
    """Calculates SuperTrend (10, 3) and checks Buy signal"""
    def evaluate(self, df: pd.DataFrame, period: int = 10, multiplier: float = 3.0) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        tr = np.maximum(high - low, np.maximum(abs(high - close.shift(1)), abs(low - close.shift(1))))
        atr = tr.rolling(period).mean().iloc[-1]
        
        hl2 = (high + low) / 2.0
        upperband = hl2 + (multiplier * atr)
        lowerband = hl2 - (multiplier * atr)
        
        curr_price = close.iloc[-1]
        is_buy = curr_price > lowerband.iloc[-1]
        score = 4.0 if is_buy else 0.0
        
        return {
            "supertrend": round(float(lowerband.iloc[-1]), 2),
            "isSuperTrendBuy": bool(is_buy),
            "score": score
        }

class IchimokuIndicator:
    """Calculates Ichimoku Kinko Hyo (Tenkan, Kijun, Senkou Span A/B)"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        tenkan = (high.rolling(9).max() + low.rolling(9).min()) / 2.0
        kijun = (high.rolling(26).max() + low.rolling(26).min()) / 2.0
        senkou_a = ((tenkan + kijun) / 2.0).shift(26)
        senkou_b = ((high.rolling(52).max() + low.rolling(52).min()) / 2.0).shift(26)
        
        curr_price = close.iloc[-1]
        t_val = tenkan.iloc[-1]
        k_val = kijun.iloc[-1]
        s_a = senkou_a.iloc[-1] if not pd.isna(senkou_a.iloc[-1]) else curr_price * 0.98
        s_b = senkou_b.iloc[-1] if not pd.isna(senkou_b.iloc[-1]) else curr_price * 0.97
        
        cloud_top = max(s_a, s_b)
        is_bullish = (curr_price > cloud_top) and (t_val > k_val)
        score = 4.0 if is_bullish else (2.0 if curr_price > cloud_top else 0.0)
        
        return {
            "tenkan": round(float(t_val), 2),
            "kijun": round(float(k_val), 2),
            "cloudTop": round(float(cloud_top), 2),
            "isIchimokuBullish": bool(is_bullish),
            "score": score
        }

class ADXIndicator:
    """Calculates Average Directional Index (ADX 14) and evaluates trend strength (> 25)"""
    def evaluate(self, df: pd.DataFrame, period: int = 14) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        up_move = high - high.shift(1)
        down_move = low.shift(1) - low
        
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
        
        tr = np.maximum(high - low, np.maximum(abs(high - close.shift(1)), abs(low - close.shift(1))))
        atr = pd.Series(tr).rolling(period).mean()
        
        plus_di = 100 * (pd.Series(plus_dm).rolling(period).mean() / (atr + 1e-6))
        minus_di = 100 * (pd.Series(minus_dm).rolling(period).mean() / (atr + 1e-6))
        
        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di + 1e-6)
        adx = dx.rolling(period).mean().iloc[-1]
        adx_val = float(adx) if not np.isnan(adx) else 20.0
        
        is_strong_trend = adx_val >= 25.0
        score = 3.0 if adx_val >= 25.0 else (1.5 if adx_val >= 20.0 else 0.0)
        
        return {
            "adx": round(adx_val, 1),
            "isStrongTrend": bool(is_strong_trend),
            "score": score
        }
