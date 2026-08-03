"""
Indicator service: fetches OHLCV data and computes all indicators.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
import numpy as np

from app.indicators.calculator import IndicatorCalculator
from app.models.schemas import IndicatorValues
from app.services.market_data import get_ohlcv, get_daily_ohlcv

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def compute_indicators(price: Optional[float] = None) -> Optional[IndicatorValues]:
    """
    Main entry-point: fetches data, runs all indicator calculations,
    and returns an IndicatorValues object.
    """
    # ----------------------------------------------------------------
    # 1. Get intraday data (5-min bars) for short-period indicators
    # ----------------------------------------------------------------
    intra_df, _ = get_ohlcv(period="5d", interval="5m")
    if intra_df is None or intra_df.empty:
        logger.error("No intraday data available")
        return None

    # ----------------------------------------------------------------
    # 2. Get daily data for long-period indicators (EMA200 etc.)
    # ----------------------------------------------------------------
    daily_df, _ = get_daily_ohlcv()

    # Use daily if we have enough rows, else fall back to intraday
    long_df = daily_df if (daily_df is not None and len(daily_df) >= 50) else intra_df

    try:
        calc_short = IndicatorCalculator(intra_df)
        calc_long  = IndicatorCalculator(long_df)
    except ValueError as e:
        logger.error("Calculator init error: %s", e)
        return None

    # ----------------------------------------------------------------
    # 3. Current price
    # ----------------------------------------------------------------
    if price is None:
        price = float(intra_df["close"].iloc[-1])

    # ----------------------------------------------------------------
    # 4. Calculate indicators
    # ----------------------------------------------------------------
    ema9   = calc_short.ema(9)
    ema20  = calc_short.ema(20)
    ema50  = calc_short.ema(50) or calc_long.ema(50)
    ema100 = calc_long.ema(100)
    ema200 = calc_long.ema(200)
    sma50  = calc_long.sma(50)
    sma200 = calc_long.sma(200)

    rsi14 = calc_short.rsi(14)

    macd_val, macd_sig, macd_hist, macd_cross = calc_short.macd()

    adx_val, plus_di, minus_di = calc_short.adx(14)
    atr_val = calc_short.atr(14)
    vwap_val = calc_short.vwap()

    bb_upper, bb_mid, bb_lower, bb_width = calc_short.bollinger(20)
    st_val, st_dir = calc_short.supertrend(7, 3.0)
    ich_tenkan, ich_kijun, ich_spa, ich_spb = calc_short.ichimoku()

    (pivot, r1, r2, r3, s1, s2, s3) = calc_short.pivot_points()
    support, resistance = calc_short.support_resistance()

    stoch_k, stoch_d = calc_short.stoch_rsi(14)
    cci_val = calc_short.cci(20)
    obv_val = calc_short.obv()

    vol_ma20 = calc_short.volume_ma(20)
    current_vol = float(intra_df["volume"].iloc[-1])
    vol_ratio = round(current_vol / vol_ma20, 2) if vol_ma20 and vol_ma20 > 0 else None

    trend = calc_short.determine_trend(ema9, ema20, ema50, ema200, price)

    # ----------------------------------------------------------------
    # 5. Build response model
    # ----------------------------------------------------------------
    return IndicatorValues(
        ema9=ema9, ema20=ema20, ema50=ema50, ema100=ema100, ema200=ema200,
        sma50=sma50, sma200=sma200,
        rsi14=rsi14,
        macd=macd_val, macd_signal=macd_sig, macd_hist=macd_hist, macd_crossover=macd_cross,
        adx=adx_val, adx_plus_di=plus_di, adx_minus_di=minus_di,
        atr=atr_val,
        vwap=vwap_val,
        bb_upper=bb_upper, bb_middle=bb_mid, bb_lower=bb_lower, bb_width=bb_width,
        supertrend=st_val, supertrend_direction=st_dir,
        ichimoku_tenkan=ich_tenkan, ichimoku_kijun=ich_kijun,
        ichimoku_senkou_a=ich_spa, ichimoku_senkou_b=ich_spb,
        pivot=pivot, pivot_r1=r1, pivot_r2=r2, pivot_r3=r3,
        pivot_s1=s1, pivot_s2=s2, pivot_s3=s3,
        support=support, resistance=resistance,
        stoch_rsi_k=stoch_k, stoch_rsi_d=stoch_d,
        cci=cci_val,
        obv=obv_val,
        volume_ma20=vol_ma20, volume_ratio=vol_ratio,
        trend=trend,
        last_updated=_now(),
    )
