import pandas as pd
from app.domain.indicators.trend import (
    EMAAlignmentIndicator, VWAPIndicator, SuperTrendIndicator, IchimokuIndicator, ADXIndicator
)
from app.domain.indicators.momentum import (
    MACDIndicator, RSIIndicator, StochasticRSIIndicator, CCIIndicator, WilliamsRIndicator, ROCIndicator
)
from app.domain.indicators.volume import (
    RelativeVolumeIndicator, OBVIndicator, CMFIndicator, MFIIndicator, AccumulationDistributionIndicator
)
from app.domain.indicators.price_action import (
    BreakoutIndicator, HigherHighLowIndicator, InsideBarIndicator, NR7Indicator, PatternRecognition
)
from app.domain.indicators.volatility import (
    ATRExpansionIndicator, BollingerSqueezeIndicator, KeltnerBreakoutIndicator, DonchianBreakoutIndicator
)
from app.domain.indicators.options import (
    OIBuildUpIndicator, PCRIndicator, IVRankIndicator
)

class AIScoreEngine:
    """
    Quantitative AI Buy Score Model (0-100 Points)
    --------------------------------------------------
    Pillars Weighting:
    - Trend:       25%
    - Momentum:    20%
    - Volume:      20%
    - Price Action:15%
    - Volatility:  10%
    - Options Data:10%
    Total:        100%
    """
    def __init__(self):
        # Trend
        self.ema_ind = EMAAlignmentIndicator()
        self.vwap_ind = VWAPIndicator()
        self.supertrend_ind = SuperTrendIndicator()
        self.ichimoku_ind = IchimokuIndicator()
        self.adx_ind = ADXIndicator()
        
        # Momentum
        self.macd_ind = MACDIndicator()
        self.rsi_ind = RSIIndicator()
        self.stoch_ind = StochasticRSIIndicator()
        self.cci_ind = CCIIndicator()
        self.williams_ind = WilliamsRIndicator()
        self.roc_ind = ROCIndicator()
        
        # Volume
        self.rvol_ind = RelativeVolumeIndicator()
        self.obv_ind = OBVIndicator()
        self.cmf_ind = CMFIndicator()
        self.mfi_ind = MFIIndicator()
        self.ad_ind = AccumulationDistributionIndicator()
        
        # Price Action
        self.breakout_ind = BreakoutIndicator()
        self.hl_ind = HigherHighLowIndicator()
        self.inside_bar_ind = InsideBarIndicator()
        self.nr7_ind = NR7Indicator()
        self.pattern_ind = PatternRecognition()
        
        # Volatility
        self.atr_ind = ATRExpansionIndicator()
        self.bb_ind = BollingerSqueezeIndicator()
        self.keltner_ind = KeltnerBreakoutIndicator()
        self.donchian_ind = DonchianBreakoutIndicator()
        
        # Options
        self.oi_ind = OIBuildUpIndicator()
        self.pcr_ind = PCRIndicator()
        self.iv_ind = IVRankIndicator()

    def calculate_score(self, df: pd.DataFrame, ticker: str = "") -> dict:
        if len(df) < 20:
            return {"totalScore": 50, "grade": "Neutral", "breakdown": {}}
            
        # 1. Trend Evaluation (Max 25 Pts)
        t_ema = self.ema_ind.evaluate(df)
        t_vwap = self.vwap_ind.evaluate(df)
        t_super = self.supertrend_ind.evaluate(df)
        t_ichi = self.ichimoku_ind.evaluate(df)
        t_adx = self.adx_ind.evaluate(df)
        trend_raw = t_ema["score"] + t_vwap["score"] + t_super["score"] + t_ichi["score"] + t_adx["score"] # max 25
        trend_score = min(25.0, trend_raw)
        
        # 2. Momentum Evaluation (Max 20 Pts)
        m_macd = self.macd_ind.evaluate(df)
        m_rsi = self.rsi_ind.evaluate(df)
        m_stoch = self.stoch_ind.evaluate(df)
        m_cci = self.cci_ind.evaluate(df)
        m_will = self.williams_ind.evaluate(df)
        m_roc = self.roc_ind.evaluate(df)
        mom_raw = m_macd["score"] + m_rsi["score"] + m_stoch["score"] + m_cci["score"] + m_will["score"] + m_roc["score"] # max 17
        mom_score = min(20.0, mom_raw * 1.18)
        
        # 3. Volume Evaluation (Max 20 Pts)
        v_rvol = self.rvol_ind.evaluate(df)
        v_obv = self.obv_ind.evaluate(df)
        v_cmf = self.cmf_ind.evaluate(df)
        v_mfi = self.mfi_ind.evaluate(df)
        v_ad = self.ad_ind.evaluate(df)
        vol_raw = v_rvol["score"] + v_obv["score"] + v_cmf["score"] + v_mfi["score"] + v_ad["score"] # max 20
        vol_score = min(20.0, vol_raw)
        
        # 4. Price Action Evaluation (Max 15 Pts)
        p_bk = self.breakout_ind.evaluate(df)
        p_hl = self.hl_ind.evaluate(df)
        p_in = self.inside_bar_ind.evaluate(df)
        p_nr = self.nr7_ind.evaluate(df)
        p_pat = self.pattern_ind.evaluate(df)
        pa_raw = p_bk["score"] + p_hl["score"] + p_in["score"] + p_nr["score"] + p_pat["score"] # max 15
        pa_score = min(15.0, pa_raw)
        
        # 5. Volatility Evaluation (Max 10 Pts)
        vo_atr = self.atr_ind.evaluate(df)
        vo_bb = self.bb_ind.evaluate(df)
        vo_kelt = self.keltner_ind.evaluate(df)
        vo_donch = self.donchian_ind.evaluate(df)
        vola_raw = vo_atr["score"] + vo_bb["score"] + vo_kelt["score"] + vo_donch["score"] # max 10
        vola_score = min(10.0, vola_raw)
        
        # 6. Options Evaluation (Max 10 Pts)
        o_oi = self.oi_ind.evaluate(df, ticker)
        o_pcr = self.pcr_ind.evaluate(ticker)
        o_iv = self.iv_ind.evaluate(ticker)
        opt_raw = o_oi["score"] + o_pcr["score"] + o_iv["score"] # max 10
        opt_score = min(10.0, opt_raw)
        
        # Total Weighted Composite Score out of 100
        total_score = int(round(trend_score + mom_score + vol_score + pa_score + vola_score + opt_score))
        total_score = min(99, max(1, total_score))
        
        if total_score >= 80: grade = "Strong Buy"
        elif total_score >= 65: grade = "Buy"
        elif total_score >= 45: grade = "Neutral"
        elif total_score >= 30: grade = "Weak"
        else: grade = "Strong Sell"
        
        return {
            "totalScore": total_score,
            "grade": grade,
            "breakdown": {
                "trend": round(trend_score, 1),
                "momentum": round(mom_score, 1),
                "volume": round(vol_score, 1),
                "priceAction": round(pa_score, 1),
                "volatility": round(vola_score, 1),
                "options": round(opt_score, 1)
            },
            "details": {
                "ema": t_ema,
                "rsi": m_rsi,
                "rvol": v_rvol,
                "macd": m_macd,
                "supertrend": t_super,
                "pattern": p_pat["pattern"],
                "oiBuildUp": o_oi["buildUpType"],
                "pcr": o_pcr["pcr"]
            }
        }
