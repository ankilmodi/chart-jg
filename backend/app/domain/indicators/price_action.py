import numpy as np
import pandas as pd

class BreakoutIndicator:
    """Evaluates 20-day High & 50-day High Breakouts"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        close = df['Close']
        high = df['High']
        
        curr_price = close.iloc[-1]
        high_20d = high.iloc[-21:-1].max() if len(high) > 21 else high.max()
        high_50d = high.iloc[-51:-1].max() if len(high) > 51 else high.max()
        
        is_20d_breakout = curr_price > high_20d
        is_50d_breakout = curr_price > high_50d
        
        score = 0.0
        if is_50d_breakout:
            score += 4.0
        elif is_20d_breakout:
            score += 2.5
            
        return {
            "high20D": round(float(high_20d), 2),
            "high50D": round(float(high_50d), 2),
            "is20DBreakout": bool(is_20d_breakout),
            "is50DBreakout": bool(is_50d_breakout),
            "score": score
        }

class HigherHighLowIndicator:
    """Evaluates Higher Highs & Higher Lows trend structure"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        high = df['High']
        low = df['Low']
        
        is_higher_high = high.iloc[-1] > high.iloc[-2] and high.iloc[-2] > high.iloc[-3]
        is_higher_low = low.iloc[-1] > low.iloc[-2] and low.iloc[-2] > low.iloc[-3]
        
        score = 0.0
        if is_higher_high: score += 2.0
        if is_higher_low: score += 2.0
        
        return {
            "isHigherHigh": bool(is_higher_high),
            "isHigherLow": bool(is_higher_low),
            "score": score
        }

class InsideBarIndicator:
    """Detects Inside Bar & Inside Bar Breakout"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        prev_inside = (high.iloc[-2] < high.iloc[-3]) and (low.iloc[-2] > low.iloc[-3])
        is_breakout = prev_inside and (close.iloc[-1] > high.iloc[-2])
        
        score = 3.0 if is_breakout else 0.0
        return {
            "isInsideBarBreakout": bool(is_breakout),
            "score": score
        }

class NR7Indicator:
    """Detects NR7 (Narrowest Range in 7 sessions) and NR7 Breakout"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        ranges = high - low
        is_nr7_prev = ranges.iloc[-2] == ranges.iloc[-8:-1].min()
        is_nr7_breakout = is_nr7_prev and (close.iloc[-1] > high.iloc[-2])
        
        score = 2.0 if is_nr7_breakout else 0.0
        return {
            "isNR7Breakout": bool(is_nr7_breakout),
            "score": score
        }

class PatternRecognition:
    """Detects Bull Flag, Cup & Handle, and Ascending Triangle price patterns"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        close = df['Close']
        high = df['High']
        low = df['Low']
        
        # Bull Flag heuristic: Strong surge 10 days ago followed by tight consolidation
        surge = (high.iloc[-5] - low.iloc[-15]) / low.iloc[-15] > 0.08
        consolidation = (high.iloc[-5:].max() - low.iloc[-5:].min()) / close.iloc[-1] < 0.03
        is_bull_flag = surge and consolidation and (close.iloc[-1] > high.iloc[-5:].max() * 0.99)
        
        # Cup and Handle heuristic: Rounding bottom over 30 days
        is_cup_handle = (close.iloc[-1] > close.iloc[-30:].max() * 0.98) and (close.iloc[-15] < close.iloc[-30] * 0.93)
        
        # Ascending Triangle: Equal highs with rising lows
        equal_highs = abs(high.iloc[-20:].max() - high.iloc[-10:].max()) / close.iloc[-1] < 0.015
        rising_lows = low.iloc[-5] > low.iloc[-15] and low.iloc[-15] > low.iloc[-25]
        is_asc_triangle = equal_highs and rising_lows
        
        pattern_name = "None"
        score = 0.0
        if is_bull_flag:
            pattern_name = "Bull Flag"
            score = 2.0
        elif is_cup_handle:
            pattern_name = "Cup & Handle"
            score = 2.0
        elif is_asc_triangle:
            pattern_name = "Ascending Triangle"
            score = 2.0
            
        return {
            "pattern": pattern_name,
            "isBullFlag": bool(is_bull_flag),
            "isCupHandle": bool(is_cup_handle),
            "isAscendingTriangle": bool(is_asc_triangle),
            "score": score
        }
