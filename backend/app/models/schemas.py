"""
Pydantic models for API request/response schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MarketData(BaseModel):
    """Current market snapshot for NIFTY FUTURE."""
    symbol: str = "NIFTY-FUTURE"
    price: float
    open: float
    high: float
    low: float
    close: float
    prev_close: float
    volume: int
    change: float
    change_pct: float
    timestamp: str
    last_updated: str


class IndicatorValues(BaseModel):
    """All calculated technical indicator values."""
    # EMA
    ema9: Optional[float] = None
    ema20: Optional[float] = None
    ema50: Optional[float] = None
    ema100: Optional[float] = None
    ema200: Optional[float] = None

    # SMA
    sma50: Optional[float] = None
    sma200: Optional[float] = None

    # RSI
    rsi14: Optional[float] = None

    # MACD
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    macd_crossover: Optional[str] = None  # "bullish" | "bearish" | "none"

    # ADX
    adx: Optional[float] = None
    adx_plus_di: Optional[float] = None
    adx_minus_di: Optional[float] = None

    # ATR
    atr: Optional[float] = None

    # VWAP
    vwap: Optional[float] = None

    # Bollinger Bands
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    bb_width: Optional[float] = None

    # Supertrend
    supertrend: Optional[float] = None
    supertrend_direction: Optional[str] = None  # "buy" | "sell"

    # Ichimoku
    ichimoku_tenkan: Optional[float] = None
    ichimoku_kijun: Optional[float] = None
    ichimoku_senkou_a: Optional[float] = None
    ichimoku_senkou_b: Optional[float] = None

    # Pivot Points
    pivot: Optional[float] = None
    pivot_r1: Optional[float] = None
    pivot_r2: Optional[float] = None
    pivot_r3: Optional[float] = None
    pivot_s1: Optional[float] = None
    pivot_s2: Optional[float] = None
    pivot_s3: Optional[float] = None

    # Support / Resistance
    support: Optional[float] = None
    resistance: Optional[float] = None

    # Stochastic RSI
    stoch_rsi_k: Optional[float] = None
    stoch_rsi_d: Optional[float] = None

    # CCI
    cci: Optional[float] = None

    # OBV
    obv: Optional[float] = None

    # Volume
    volume_ma20: Optional[float] = None
    volume_ratio: Optional[float] = None  # current / ma20

    # Trend
    trend: str = "sideways"  # "bullish" | "bearish" | "sideways"

    last_updated: str


class SignalReason(BaseModel):
    """Individual reason contributing to a signal."""
    indicator: str
    value: str
    points: int
    max_points: int
    bullish: bool


class SignalResponse(BaseModel):
    """Trading signal with confidence and reasons."""
    signal: str  # "BUY" | "SELL" | "WAIT"
    confidence: float  # 0-100
    trend: str  # "bullish" | "bearish" | "sideways"
    price: float
    reasons: List[SignalReason]
    buy_score: int
    sell_score: int
    last_updated: str


class Candle(BaseModel):
    """OHLCV candle data."""
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class HistoryResponse(BaseModel):
    """Historical candlestick data."""
    symbol: str
    interval: str
    candles: List[Candle]
    total: int


class HealthResponse(BaseModel):
    """API health check response."""
    status: str
    version: str
    data_source: str
    last_fetch: Optional[str] = None
    cache_age_seconds: Optional[float] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    timestamp: str
