import numpy as np
import pandas as pd

class MACDIndicator:
    """Calculates MACD (12, 26, 9), Histogram, and evaluates Bullish Crossover & Increasing Histogram"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        close = df['Close']
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9, adjust=False).mean()
        hist = macd - signal
        
        curr_macd = macd.iloc[-1]
        curr_signal = signal.iloc[-1]
        curr_hist = hist.iloc[-1]
        prev_hist = hist.iloc[-2] if len(hist) > 1 else curr_hist
        
        is_cross = (curr_macd > curr_signal)
        is_hist_increasing = (curr_hist > prev_hist) and (curr_hist > 0)
        
        score = 0.0
        if is_cross: score += 2.5
        if is_hist_increasing: score += 2.5
        
        return {
            "macd": round(float(curr_macd), 2),
            "signal": round(float(curr_signal), 2),
            "hist": round(float(curr_hist), 2),
            "isBullishCross": bool(is_cross),
            "isHistIncreasing": bool(is_hist_increasing),
            "score": score
        }

class RSIIndicator:
    """Calculates RSI (14) and evaluates 55-70 momentum zone"""
    def evaluate(self, df: pd.DataFrame, period: int = 14) -> dict:
        close = df['Close']
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / (loss + 1e-6)
        rsi_series = 100 - (100 / (1 + rs))
        rsi_val = float(rsi_series.iloc[-1]) if not np.isnan(rsi_series.iloc[-1]) else 50.0
        
        # 55-70 is the sweet spot for strong momentum
        if 55.0 <= rsi_val <= 70.0:
            score = 5.0
        elif 50.0 <= rsi_val < 55.0 or 70.0 < rsi_val <= 75.0:
            score = 3.5
        elif 40.0 <= rsi_val < 50.0:
            score = 2.0
        else:
            score = 1.0
            
        return {
            "rsi": round(rsi_val, 1),
            "isOptimalZone": (55.0 <= rsi_val <= 70.0),
            "score": score
        }

class StochasticRSIIndicator:
    """Calculates Stochastic RSI (%K, %D) and checks Bullish Crossover"""
    def evaluate(self, df: pd.DataFrame, period: int = 14) -> dict:
        close = df['Close']
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / (loss + 1e-6)
        rsi = 100 - (100 / (1 + rs))
        
        stoch_rsi = (rsi - rsi.rolling(period).min()) / (rsi.rolling(period).max() - rsi.rolling(period).min() + 1e-6)
        k = stoch_rsi.rolling(3).mean() * 100
        d = k.rolling(3).mean()
        
        k_val = float(k.iloc[-1]) if not np.isnan(k.iloc[-1]) else 50.0
        d_val = float(d.iloc[-1]) if not np.isnan(d.iloc[-1]) else 50.0
        
        is_bullish = k_val > d_val and k_val < 80.0
        score = 3.0 if is_bullish else 1.0
        
        return {
            "stochK": round(k_val, 1),
            "stochD": round(d_val, 1),
            "isStochBullish": bool(is_bullish),
            "score": score
        }

class CCIIndicator:
    """Calculates Commodity Channel Index (CCI 20) and evaluates CCI > 100"""
    def evaluate(self, df: pd.DataFrame, period: int = 20) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        tp = (high + low + close) / 3.0
        sma_tp = tp.rolling(period).mean()
        mad = tp.rolling(period).apply(lambda x: np.mean(np.abs(x - np.mean(x))), raw=True)
        
        cci = (tp - sma_tp) / (0.015 * mad + 1e-6)
        cci_val = float(cci.iloc[-1]) if not np.isnan(cci.iloc[-1]) else 0.0
        
        is_above_100 = cci_val > 100.0
        score = 2.5 if is_above_100 else (1.5 if cci_val > 0 else 0.0)
        
        return {
            "cci": round(cci_val, 1),
            "isCCIBullish": bool(is_above_100),
            "score": score
        }

class WilliamsRIndicator:
    """Calculates Williams %R (14) and evaluates Recovery from Oversold (< -80)"""
    def evaluate(self, df: pd.DataFrame, period: int = 14) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        highest_high = high.rolling(period).max()
        lowest_low = low.rolling(period).min()
        
        williams_r = -100 * (highest_high - close) / (highest_high - lowest_low + 1e-6)
        w_val = float(williams_r.iloc[-1]) if not np.isnan(williams_r.iloc[-1]) else -50.0
        
        is_recovering = w_val > -80.0 and w_val < -20.0
        score = 2.0 if is_recovering else 0.5
        
        return {
            "williamsR": round(w_val, 1),
            "isRecovering": bool(is_recovering),
            "score": score
        }

class ROCIndicator:
    """Calculates Rate of Change (ROC 12) and checks ROC > 0"""
    def evaluate(self, df: pd.DataFrame, period: int = 12) -> dict:
        close = df['Close']
        roc = ((close - close.shift(period)) / (close.shift(period) + 1e-6)) * 100.0
        roc_val = float(roc.iloc[-1]) if not np.isnan(roc.iloc[-1]) else 0.0
        
        is_positive = roc_val > 0.0
        score = 2.0 if is_positive else 0.0
        
        return {
            "roc": round(roc_val, 2),
            "isROCPositive": bool(is_positive),
            "score": score
        }
