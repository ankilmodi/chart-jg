import numpy as np
import pandas as pd

class ATRExpansionIndicator:
    """Calculates Average True Range (ATR 14) and evaluates Volatility Expansion"""
    def evaluate(self, df: pd.DataFrame, period: int = 14) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        tr = np.maximum(high - low, np.maximum(abs(high - close.shift(1)), abs(low - close.shift(1))))
        atr = pd.Series(tr).rolling(period).mean()
        
        curr_atr = float(atr.iloc[-1])
        avg_atr = float(atr.rolling(20).mean().iloc[-1])
        
        is_expanding = curr_atr > avg_atr * 1.2
        score = 2.5 if is_expanding else (1.5 if curr_atr > avg_atr else 0.5)
        
        return {
            "atr": round(curr_atr, 2),
            "atrRatio": round(curr_atr / (avg_atr + 1e-6), 2),
            "isATRExpanding": bool(is_expanding),
            "score": score
        }

class BollingerSqueezeIndicator:
    """Calculates Bollinger Bands (20, 2) and evaluates Squeeze Breakout"""
    def evaluate(self, df: pd.DataFrame, period: int = 20, num_std: float = 2.0) -> dict:
        close = df['Close']
        sma = close.rolling(period).mean()
        std = close.rolling(period).std()
        
        upper = sma + (std * num_std)
        lower = sma - (std * num_std)
        bandwidth = (upper - lower) / sma
        
        curr_price = close.iloc[-1]
        is_squeeze = bandwidth.iloc[-2] < bandwidth.rolling(50).min().iloc[-2] * 1.1
        is_breakout = is_squeeze and (curr_price > upper.iloc[-1])
        
        score = 3.0 if is_breakout else (1.5 if curr_price > upper.iloc[-1] else 0.5)
        return {
            "bbUpper": round(float(upper.iloc[-1]), 2),
            "bbLower": round(float(lower.iloc[-1]), 2),
            "isBBSqueezeBreakout": bool(is_breakout),
            "score": score
        }

class KeltnerBreakoutIndicator:
    """Calculates Keltner Channels (20, 1.5) and evaluates Channel Breakout"""
    def evaluate(self, df: pd.DataFrame, period: int = 20) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        ema = close.ewm(span=period, adjust=False).mean()
        tr = np.maximum(high - low, np.maximum(abs(high - close.shift(1)), abs(low - close.shift(1))))
        atr = pd.Series(tr).rolling(period).mean()
        
        upper = ema + (1.5 * atr)
        curr_price = close.iloc[-1]
        is_breakout = curr_price > upper.iloc[-1]
        
        score = 2.5 if is_breakout else 0.5
        return {
            "keltnerUpper": round(float(upper.iloc[-1]), 2),
            "isKeltnerBreakout": bool(is_breakout),
            "score": score
        }

class DonchianBreakoutIndicator:
    """Calculates Donchian Channels (20) and evaluates Upper Channel Breakout"""
    def evaluate(self, df: pd.DataFrame, period: int = 20) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        upper = high.rolling(period).max()
        curr_price = close.iloc[-1]
        is_breakout = curr_price >= upper.iloc[-2]
        
        score = 2.0 if is_breakout else 0.5
        return {
            "donchianUpper": round(float(upper.iloc[-1]), 2),
            "isDonchianBreakout": bool(is_breakout),
            "score": score
        }
