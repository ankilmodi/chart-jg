import numpy as np
import pandas as pd

class RelativeVolumeIndicator:
    """Calculates Relative Volume (RVOL) = Current Volume / 20-day Avg Volume"""
    def evaluate(self, df: pd.DataFrame, period: int = 20) -> dict:
        vol = df['Volume']
        avg_vol = vol.rolling(period).mean()
        curr_vol = vol.iloc[-1]
        mean_vol = avg_vol.iloc[-1] if not pd.isna(avg_vol.iloc[-1]) else 1.0
        
        rvol = curr_vol / (mean_vol + 1e-6)
        rvol_val = float(rvol)
        
        is_high_volume = rvol_val >= 2.0
        if rvol_val >= 2.0:
            score = 6.0
        elif rvol_val >= 1.5:
            score = 4.5
        elif rvol_val >= 1.0:
            score = 3.0
        else:
            score = 1.0
            
        return {
            "volume": int(curr_vol),
            "avgVolume": int(mean_vol),
            "rvol": round(rvol_val, 2),
            "isHighVolume": bool(is_high_volume),
            "score": score
        }

class OBVIndicator:
    """Calculates On-Balance Volume (OBV) and evaluates if OBV is Rising"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        close = df['Close']
        vol = df['Volume']
        
        direction = np.sign(close.diff().fillna(0))
        obv = (direction * vol).cumsum()
        
        curr_obv = obv.iloc[-1]
        sma_obv = obv.rolling(10).mean().iloc[-1]
        
        is_rising = curr_obv > sma_obv
        score = 4.0 if is_rising else 1.0
        
        return {
            "obv": int(curr_obv),
            "isOBVRising": bool(is_rising),
            "score": score
        }

class CMFIndicator:
    """Calculates Chaikin Money Flow (CMF 20) and evaluates CMF > 0"""
    def evaluate(self, df: pd.DataFrame, period: int = 20) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        vol = df['Volume']
        
        mf_multiplier = ((close - low) - (high - close)) / (high - low + 1e-6)
        mf_volume = mf_multiplier * vol
        
        cmf = mf_volume.rolling(period).sum() / (vol.rolling(period).sum() + 1e-6)
        cmf_val = float(cmf.iloc[-1]) if not np.isnan(cmf.iloc[-1]) else 0.0
        
        is_positive = cmf_val > 0.0
        if cmf_val > 0.15:
            score = 4.0
        elif cmf_val > 0.0:
            score = 3.0
        else:
            score = 0.5
            
        return {
            "cmf": round(cmf_val, 2),
            "isCMFPositive": bool(is_positive),
            "score": score
        }

class MFIIndicator:
    """Calculates Money Flow Index (MFI 14) and evaluates MFI > 60"""
    def evaluate(self, df: pd.DataFrame, period: int = 14) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        vol = df['Volume']
        
        tp = (high + low + close) / 3.0
        raw_money_flow = tp * vol
        
        positive_flow = np.where(tp > tp.shift(1), raw_money_flow, 0.0)
        negative_flow = np.where(tp < tp.shift(1), raw_money_flow, 0.0)
        
        pos_mf_sum = pd.Series(positive_flow).rolling(period).sum()
        neg_mf_sum = pd.Series(negative_flow).rolling(period).sum()
        
        mfi = 100 - (100 / (1 + pos_mf_sum / (neg_mf_sum + 1e-6)))
        mfi_val = float(mfi.iloc[-1]) if not np.isnan(mfi.iloc[-1]) else 50.0
        
        is_strong = mfi_val > 60.0
        if mfi_val > 60.0:
            score = 3.5
        elif mfi_val > 50.0:
            score = 2.5
        else:
            score = 1.0
            
        return {
            "mfi": round(mfi_val, 1),
            "isMFIBullish": bool(is_strong),
            "score": score
        }

class AccumulationDistributionIndicator:
    """Calculates Accumulation/Distribution (A/D) line and checks if Rising"""
    def evaluate(self, df: pd.DataFrame) -> dict:
        high = df['High']
        low = df['Low']
        close = df['Close']
        vol = df['Volume']
        
        clv = ((close - low) - (high - close)) / (high - low + 1e-6)
        ad = (clv * vol).cumsum()
        
        curr_ad = ad.iloc[-1]
        sma_ad = ad.rolling(10).mean().iloc[-1]
        
        is_rising = curr_ad > sma_ad
        score = 2.5 if is_rising else 0.5
        
        return {
            "adLine": float(curr_ad),
            "isADRising": bool(is_rising),
            "score": score
        }
