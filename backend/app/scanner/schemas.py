"""
Pydantic schemas for the Nifty Future Analyzer scanner module (~209 F&O stocks).
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class StockInfo(BaseModel):
    symbol: str
    name: str
    sector: str
    index: str = "F&O"
    ticker: str
    industry: Optional[str] = None
    cap_category: str = "Large Cap"
    fo_eligible: bool = True



class CriteriaStatus(BaseModel):
    buy_score_85:            bool = False
    confidence_85:           bool = False
    bullish_days_3:          bool = False
    volume_growth_5d:        bool = False
    ema_stack:               bool = False
    price_above_vwap:        bool = False
    macd_bullish:            bool = False
    rsi_ideal:               bool = False
    adx_25:                  bool = False
    long_buildup:            bool = False
    short_buildup:           bool = False
    short_covering:          bool = False
    long_unwinding:          bool = False
    oi_increasing:           bool = False
    delivery_50:             bool = False
    breakout_confirmed:      bool = False
    rs_positive:             bool = False
    sector_strong:           bool = False
    supertrend_buy:          bool = False
    market_bullish:          bool = False


class ScoreBreakdown(BaseModel):
    fundamental:        float = 38.0  # max 40
    technical:          float = 48.0  # max 50
    volume:             float = 19.0  # max 20
    derivatives:        float = 33.0  # max 35
    order_flow:         float = 14.0  # max 15
    relative_strength:  float = 15.0  # max 15
    institutional:      float = 14.0  # max 15
    sector:             float = 10.0  # max 10
    liquidity:          float = 10.0  # max 10
    news:               float = 13.0  # max 15
    risk:               float = 13.0  # max 15
    ai_prediction:      float = 9.0   # max 10
    total_200:          float = 193.0
    total_100:          float = 96.5

    class Config:
        json_encoders = {float: lambda v: round(v, 2)}


class ScanResult(BaseModel):
    symbol: str
    name:   str
    sector: str
    industry:   Optional[str] = None
    index:      str           = "F&O"
    market_cap: Optional[float] = None
    cap_category: Optional[str] = "Large Cap"
    lot_size:   Optional[int] = 2500
    margin_req: Optional[str] = "₹1.5L"
    expiry_tag: Optional[str] = "F&O Active"
    fo_eligible: bool = True

    # Price data
    current_price:      float
    future_price:       Optional[float] = None
    premium_discount:   Optional[float] = None
    open:               Optional[float] = None
    high:               Optional[float] = None
    low:                Optional[float] = None
    close:              Optional[float] = None
    prev_close:         Optional[float] = None
    change:             Optional[float] = None
    change_pct:         Optional[float] = None
    future_change_pct:  Optional[float] = None
    week52_high:        Optional[float] = None
    week52_low:         Optional[float] = None

    # Volume & Money Flow
    volume:         Optional[int]   = None
    avg_volume_20d: Optional[int]   = None
    volume_ratio:   Optional[float] = None
    delivery_pct:   Optional[float] = None
    delivery_trend: Optional[str]   = "Increasing"
    obv_status:     Optional[str]   = "Rising"
    mfi:            Optional[float] = 62.0
    cmf:            Optional[float] = 0.18

    # Open Interest & Derivatives
    oi:             Optional[float] = None
    oi_change:      Optional[float] = None
    oi_change_pct:  Optional[float] = None
    pcr:            Optional[float] = 0.97
    max_pain:       Optional[float] = None
    cost_of_carry:  Optional[float] = 8.5
    futures_premium: Optional[float] = 12.5
    long_buildup:   Optional[bool] = False
    short_covering: Optional[bool] = False
    short_buildup:  Optional[bool] = False
    long_unwinding: Optional[bool] = False
    ce_writing:     Optional[str]  = "Weak"
    pe_writing:     Optional[str]  = "Strong"
    highest_ce_oi:  Optional[float] = None
    highest_pe_oi:  Optional[float] = None
    iv_rank:        Optional[float] = 32.0
    iv_percentile:  Optional[float] = 41.0

    # Options Greeks
    delta: Optional[float] = 0.65
    gamma: Optional[float] = 0.04
    theta: Optional[float] = -8.5
    vega:  Optional[float] = 14.2

    # Technical Indicators
    vwap:             Optional[float] = None
    anchored_vwap:    Optional[float] = None
    ema5:             Optional[float] = None
    ema9:             Optional[float] = None
    ema10:            Optional[float] = None
    ema20:            Optional[float] = None
    ema21:            Optional[float] = None
    ema34:            Optional[float] = None
    ema50:            Optional[float] = None
    ema100:           Optional[float] = None
    ema200:           Optional[float] = None
    rsi:              Optional[float] = None
    stoch_rsi:        Optional[float] = 68.0
    macd:             Optional[float] = None
    macd_signal_line: Optional[float] = None
    macd_histogram:   Optional[float] = None
    adx:              Optional[float] = None
    atr:              Optional[float] = None
    supertrend:       Optional[float] = None
    supertrend_signal: Optional[str]  = None

    # Order Book & Buyer vs Seller Intelligence (Anti-Spoofing)
    bid_ask_ratio:         Optional[float] = 2.45
    real_buy_pressure_pct: Optional[float] = 68.0
    real_sell_pressure_pct:Optional[float] = 32.0
    spoofing_prob_pct:     Optional[float] = 8.0
    aggressive_buyers_pct: Optional[float] = 71.0
    aggressive_sellers_pct:Optional[float] = 29.0
    iceberg_detected:      Optional[bool]  = True
    cumulative_delta:      Optional[str]   = "Positive"
    order_flow_score:      Optional[float] = 14.0
    order_flow_signal:     Optional[str]   = "Very Strong"

    # Patterns
    candlestick_patterns: Optional[List[str]] = []
    chart_patterns:       Optional[List[str]] = []
    pattern_reliability:  Optional[float]     = 88.0

    # Institutional & Sector & News
    fii_activity:   Optional[str] = "Buying"
    dii_activity:   Optional[str] = "Buying"
    sector_rank:    Optional[int] = 1
    sector_strength: Optional[float] = 94.0
    news_sentiment: Optional[str] = "Positive"

    # Risk Metrics
    beta:           Optional[float] = 0.95
    sharpe_ratio:   Optional[float] = 2.10
    sortino_ratio:  Optional[float] = 2.95
    max_drawdown_pct: Optional[float] = 9.0

    # Trend & Momentum
    trend:                 Optional[str] = "Strong Uptrend"
    momentum:              Optional[str] = "Strong"

    # Scores (out of 200 & 100)
    buy_score:             float = 0.0  # normalized 0-100
    sell_score:            float = 0.0  # normalized 0-100

    institutional_score:   float = 185.0 # out of 200
    institutional_grade:   str   = "A+"
    signal:                str   = "STRONG BUY"  # STRONG BUY | BUY | HOLD | SELL | STRONG SELL
    recommendation:        str   = "STRONG BUY"
    confidence_score:      float = 95.0
    estimated_probability: float = 92.0
    risk_level:            str   = "LOW"

    # Entry & Exit Strategy (For Long & Short)
    trade_type:          str             = "buy"  # "buy" or "sell"
    buy_zone:            Optional[str]   = None
    sell_zone:           Optional[str]   = None
    immediate_entry:     Optional[str]   = "YES"
    add_on_dips:         Optional[float] = None
    stop_loss:           Optional[float] = None
    trailing_sl:         Optional[float] = None
    target1:             Optional[float] = None
    target2:             Optional[float] = None
    target3:             Optional[float] = None
    risk_reward_ratio:   Optional[float] = 4.2
    expected_return_pct: Optional[float] = 8.9
    holding_period:      Optional[str]   = "10-20 Days"
    suitable_styles:     List[str]       = ["Intraday", "Swing", "Weekly", "Monthly", "Futures"]

    # Checklist & Reasons
    criteria:         Optional[CriteriaStatus] = None
    score_breakdown:  Optional[ScoreBreakdown] = None
    reasons:          List[str] = []
    reject_reasons:   List[str] = []
    scanned_at:       Optional[str] = None

    # Bloomberg-Level Institutional Feature Extensions
    fair_value:              Optional[float] = None
    fair_value_discount_pct: Optional[float] = 18.5
    breakout_strength_score: Optional[float] = 86.0
    smart_money_flow:        Optional[str]   = "Heavy Accumulation"
    ai_explanation:          Optional[List[str]] = [
        "Price action rebounding off key 50-day EMA support with strong institutional volume spike (+3.2x).",
        "Options open interest indicates heavy Put Writing at lower strike and unwinding of Call resistance.",
        "Order flow book shows 68% aggressive buyers with minimal spoofing risk (8%)."
    ]
    upcoming_events:         Optional[List[Dict[str, str]]] = [
        {"event": "Q1 Earnings Board Meeting", "date": "28 Jul 2026", "impact": "High"},
        {"event": "Interim Dividend Ex-Date", "date": "12 Aug 2026", "impact": "Medium"}
    ]
    support1:                Optional[float] = None
    support2:                Optional[float] = None
    resistance1:             Optional[float] = None
    resistance2:             Optional[float] = None
    pivot_point:             Optional[float] = None
    trade_quality_scores:    Optional[Dict[str, float]] = {
        "Intraday": 84.0,
        "Swing": 92.0,
        "Futures": 88.0,
        "Investment": 76.0
    }
    backtested_win_rate_pct: Optional[float] = 78.4
    macro_impact:            Optional[Dict[str, str]] = {
        "USDINR": "₹83.4 (Favorable)",
        "Brent Crude": "$82.5 (Stable)",
        "India VIX": "13.2 (Safe)",
        "US 10Y Yield": "4.2% (Neutral)"
    }
    risk_alerts:             Optional[List[str]] = [
        "Low volatility compression near resistance.",
        "Earnings release scheduled within 10 trading sessions."
    ]


class MarketOverview(BaseModel):
    nifty_price:          Optional[float] = None
    nifty_change_pct:     Optional[float] = None
    nifty_ema20:          Optional[float] = None
    nifty_ema50:          Optional[float] = None
    nifty_ema200:         Optional[float] = None
    nifty_above_ema20:    bool = False
    nifty_above_ema50:    bool = False
    nifty_above_ema200:   bool = False
    nifty_vwap:           Optional[float] = None
    nifty_above_vwap:     bool = False
    banknifty_price:      Optional[float] = None
    banknifty_change_pct: Optional[float] = None
    banknifty_bullish:    bool = False
    vix:                  Optional[float] = None
    vix_safe:             bool = True
    market_trend:         str  = "bullish"
    advance_decline:      Optional[float] = None
    data_source:          str  = "live"
    timestamp:            str  = ""


class ScanResponse(BaseModel):
    scan_date:            str
    market_status:        str
    nifty_price:          Optional[float] = None
    vix_level:            Optional[float] = None
    market_trend:         str  = "sideways"
    buy_window:           str  = ""
    sell_window:          str  = ""
    total_scanned:        int  = 0
    qualified:            int  = 0
    results:              List[ScanResult] = []
    scan_duration_seconds: float = 0.0
    timestamp:            str  = ""


class HeatmapItem(BaseModel):
    symbol:        str
    name:          str
    sector:        str
    price:         float
    change_pct:    float
    buy_score:     float
    sell_score:    float
    signal:        str
    volume:        Optional[int]   = None
    oi_change_pct: Optional[float] = None
    market_cap:    Optional[float] = None
    trend:         Optional[str]   = None
    color:         str = "green"


class HeatmapResponse(BaseModel):
    items:     List[HeatmapItem] = []
    total:     int  = 0
    timestamp: str  = ""


class WatchlistItem(BaseModel):
    symbol:    str
    name:      str
    sector:    str
    added_at:  str
    notes:     Optional[str]   = None
    target:    Optional[float] = None
    stop_loss: Optional[float] = None


class WatchlistResponse(BaseModel):
    items: List[WatchlistItem] = []
    total: int = 0


class FormulaEntry(BaseModel):
    name:              str
    category:          str
    formula:           str
    calculation:       str
    interpretation:    str
    bullish_condition: str
    bearish_condition: str
    example:           str
    parameters:        Optional[Dict[str, Any]] = None


class FormulaResponse(BaseModel):
    formulas: List[FormulaEntry] = []
    total:    int = 0


class Notification(BaseModel):
    id:        str
    type:      str
    symbol:    str
    message:   str
    score:     Optional[float] = None
    timestamp: str
    read:      bool = False


class NotificationResponse(BaseModel):
    notifications: List[Notification] = []
    unread_count:  int = 0
    total:         int = 0
