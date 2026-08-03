"""
Technical indicators calculation engine.
Uses the 'ta' library (actively maintained, pure-Python, Python 3.14 compatible).
Falls back to manual pandas/numpy implementations where needed.

Library: https://github.com/bukosabino/ta
Install: pip install ta
"""
import logging
from typing import Optional, Tuple
import numpy as np
import pandas as pd

try:
    import ta
    HAS_TA = True
except ImportError:
    HAS_TA = False
    logging.warning("'ta' library not available – using manual calculations only")

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Manual helpers (used both as fallback and for indicators ta doesn't cover)
# ---------------------------------------------------------------------------

def _ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def _sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(window=period).mean()


def _rsi_manual(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain  = delta.clip(lower=0)
    loss  = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, adjust=False).mean()
    avg_loss = loss.ewm(com=period - 1, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _safe_float(v) -> Optional[float]:
    """Return float or None if NaN/None."""
    try:
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else f
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Main calculator
# ---------------------------------------------------------------------------

class IndicatorCalculator:
    """
    Calculates all technical indicators from a DataFrame of OHLCV data.

    Expected columns : open, high, low, close, volume  (lowercase)
    Expected index   : DatetimeIndex (ascending)
    """

    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        # Ensure numeric dtypes
        for col in ["open", "high", "low", "close", "volume"]:
            if col in self.df.columns:
                self.df[col] = pd.to_numeric(self.df[col], errors="coerce")
        self._validate()

    def _validate(self):
        required = {"open", "high", "low", "close", "volume"}
        missing  = required - set(self.df.columns)
        if missing:
            raise ValueError(f"DataFrame missing columns: {missing}")
        if len(self.df) < 20:
            raise ValueError("Not enough data – need at least 20 candles")

    # ------------------------------------------------------------------
    # EMA / SMA
    # ------------------------------------------------------------------

    def ema(self, period: int) -> Optional[float]:
        try:
            return _safe_float(_ema(self.df["close"], period).iloc[-1])
        except Exception as e:
            logger.debug("EMA%d error: %s", period, e)
            return None

    def sma(self, period: int) -> Optional[float]:
        try:
            if len(self.df) < period:
                return None
            return _safe_float(_sma(self.df["close"], period).iloc[-1])
        except Exception as e:
            logger.debug("SMA%d error: %s", period, e)
            return None

    # ------------------------------------------------------------------
    # RSI
    # ------------------------------------------------------------------

    def rsi(self, period: int = 14) -> Optional[float]:
        try:
            if HAS_TA:
                values = ta.momentum.RSIIndicator(
                    close=self.df["close"], window=period
                ).rsi()
            else:
                values = _rsi_manual(self.df["close"], period)
            return _safe_float(values.iloc[-1])
        except Exception as e:
            logger.debug("RSI error: %s", e)
            return None

    # ------------------------------------------------------------------
    # MACD
    # ------------------------------------------------------------------

    def macd(self) -> Tuple[Optional[float], Optional[float], Optional[float], str]:
        """Returns (macd_line, signal_line, histogram, crossover_str)."""
        try:
            if HAS_TA:
                ind = ta.trend.MACD(
                    close=self.df["close"],
                    window_slow=26, window_fast=12, window_sign=9
                )
                macd_s   = ind.macd()
                signal_s = ind.macd_signal()
                hist_s   = ind.macd_diff()
            else:
                ema12    = _ema(self.df["close"], 12)
                ema26    = _ema(self.df["close"], 26)
                macd_s   = ema12 - ema26
                signal_s = _ema(macd_s, 9)
                hist_s   = macd_s - signal_s

            macd_val  = _safe_float(macd_s.iloc[-1])
            sig_val   = _safe_float(signal_s.iloc[-1])
            hist_val  = _safe_float(hist_s.iloc[-1])
            prev_hist = _safe_float(hist_s.iloc[-2]) if len(hist_s) > 1 else 0.0

            if macd_val is None:
                return None, None, None, "none"

            if hist_val is not None and prev_hist is not None:
                if hist_val > 0 and prev_hist <= 0:
                    crossover = "bullish"
                elif hist_val < 0 and prev_hist >= 0:
                    crossover = "bearish"
                elif hist_val is not None:
                    crossover = "bullish" if hist_val > 0 else "bearish"
                else:
                    crossover = "none"
            else:
                crossover = "none"

            def r4(v): return round(v, 4) if v is not None else None
            return r4(macd_val), r4(sig_val), r4(hist_val), crossover
        except Exception as e:
            logger.debug("MACD error: %s", e)
            return None, None, None, "none"

    # ------------------------------------------------------------------
    # ADX
    # ------------------------------------------------------------------

    def adx(self, period: int = 14) -> Tuple[Optional[float], Optional[float], Optional[float]]:
        """Returns (adx, +DI, -DI)."""
        try:
            if HAS_TA:
                ind = ta.trend.ADXIndicator(
                    high=self.df["high"], low=self.df["low"],
                    close=self.df["close"], window=period
                )
                adx_val  = _safe_float(ind.adx().iloc[-1])
                dmp_val  = _safe_float(ind.adx_pos().iloc[-1])
                dmn_val  = _safe_float(ind.adx_neg().iloc[-1])
            else:
                # Manual ADX
                high, low, close = self.df["high"], self.df["low"], self.df["close"]
                tr = pd.concat([
                    high - low,
                    (high - close.shift()).abs(),
                    (low  - close.shift()).abs()
                ], axis=1).max(axis=1)
                atr_s = tr.rolling(period).mean()
                up    = high.diff()
                down  = -low.diff()
                plus_dm  = np.where((up > down) & (up > 0), up, 0.0)
                minus_dm = np.where((down > up) & (down > 0), down, 0.0)
                plus_di  = 100 * pd.Series(plus_dm, index=high.index).rolling(period).mean() / atr_s
                minus_di = 100 * pd.Series(minus_dm, index=high.index).rolling(period).mean() / atr_s
                dx       = (abs(plus_di - minus_di) / (plus_di + minus_di).replace(0, np.nan)) * 100
                adx_s    = dx.rolling(period).mean()
                adx_val  = _safe_float(adx_s.iloc[-1])
                dmp_val  = _safe_float(plus_di.iloc[-1])
                dmn_val  = _safe_float(minus_di.iloc[-1])

            def r2(v): return round(v, 2) if v is not None else None
            return r2(adx_val), r2(dmp_val), r2(dmn_val)
        except Exception as e:
            logger.debug("ADX error: %s", e)
            return None, None, None

    # ------------------------------------------------------------------
    # ATR
    # ------------------------------------------------------------------

    def atr(self, period: int = 14) -> Optional[float]:
        try:
            if HAS_TA:
                values = ta.volatility.AverageTrueRange(
                    high=self.df["high"], low=self.df["low"],
                    close=self.df["close"], window=period
                ).average_true_range()
            else:
                tr = pd.concat([
                    self.df["high"] - self.df["low"],
                    (self.df["high"] - self.df["close"].shift()).abs(),
                    (self.df["low"]  - self.df["close"].shift()).abs()
                ], axis=1).max(axis=1)
                values = tr.rolling(period).mean()
            v = _safe_float(values.iloc[-1])
            return round(v, 2) if v is not None else None
        except Exception as e:
            logger.debug("ATR error: %s", e)
            return None

    # ------------------------------------------------------------------
    # VWAP (manual – ta library VWAP requires intraday reset)
    # ------------------------------------------------------------------

    def vwap(self) -> Optional[float]:
        try:
            typical  = (self.df["high"] + self.df["low"] + self.df["close"]) / 3
            cum_vol  = self.df["volume"].cumsum()
            cum_tpv  = (typical * self.df["volume"]).cumsum()
            vwap_val = cum_tpv / cum_vol.replace(0, np.nan)
            v = _safe_float(vwap_val.iloc[-1])
            return round(v, 2) if v is not None else None
        except Exception as e:
            logger.debug("VWAP error: %s", e)
            return None

    # ------------------------------------------------------------------
    # Bollinger Bands
    # ------------------------------------------------------------------

    def bollinger(self, period: int = 20, std: float = 2.0) -> Tuple:
        """Returns (upper, middle, lower, width_pct)."""
        try:
            if HAS_TA:
                bb = ta.volatility.BollingerBands(
                    close=self.df["close"], window=period, window_dev=std
                )
                upper  = _safe_float(bb.bollinger_hband().iloc[-1])
                middle = _safe_float(bb.bollinger_mavg().iloc[-1])
                lower  = _safe_float(bb.bollinger_lband().iloc[-1])
            else:
                mid    = _sma(self.df["close"], period)
                sd     = self.df["close"].rolling(period).std()
                upper  = _safe_float((mid + std * sd).iloc[-1])
                middle = _safe_float(mid.iloc[-1])
                lower  = _safe_float((mid - std * sd).iloc[-1])

            if upper is None or middle is None or lower is None:
                return None, None, None, None
            width = round((upper - lower) / middle * 100, 2) if middle else None
            return round(upper, 2), round(middle, 2), round(lower, 2), width
        except Exception as e:
            logger.debug("Bollinger error: %s", e)
            return None, None, None, None

    # ------------------------------------------------------------------
    # Supertrend (manual – 'ta' doesn't include Supertrend)
    # ------------------------------------------------------------------

    def supertrend(self, period: int = 7, multiplier: float = 3.0) -> Tuple[Optional[float], Optional[str]]:
        """Returns (supertrend_value, 'buy' | 'sell')."""
        try:
            df   = self.df.copy().reset_index(drop=True)
            hl2  = (df["high"] + df["low"]) / 2
            tr   = pd.concat([
                df["high"] - df["low"],
                (df["high"] - df["close"].shift()).abs(),
                (df["low"]  - df["close"].shift()).abs()
            ], axis=1).max(axis=1)
            atr_s = tr.ewm(span=period, adjust=False).mean()

            upper_basic = hl2 + multiplier * atr_s
            lower_basic = hl2 - multiplier * atr_s

            upper = upper_basic.copy()
            lower = lower_basic.copy()
            for i in range(1, len(df)):
                upper.iloc[i] = upper_basic.iloc[i] if (upper_basic.iloc[i] < upper.iloc[i - 1] or df["close"].iloc[i - 1] > upper.iloc[i - 1]) else upper.iloc[i - 1]
                lower.iloc[i] = lower_basic.iloc[i] if (lower_basic.iloc[i] > lower.iloc[i - 1] or df["close"].iloc[i - 1] < lower.iloc[i - 1]) else lower.iloc[i - 1]

            direction = pd.Series(index=df.index, dtype=int)
            direction.iloc[0] = 1
            for i in range(1, len(df)):
                if df["close"].iloc[i] > upper.iloc[i - 1]:
                    direction.iloc[i] = 1
                elif df["close"].iloc[i] < lower.iloc[i - 1]:
                    direction.iloc[i] = -1
                else:
                    direction.iloc[i] = direction.iloc[i - 1]

            last_dir = int(direction.iloc[-1])
            last_st  = float(lower.iloc[-1]) if last_dir == 1 else float(upper.iloc[-1])
            return round(last_st, 2), "buy" if last_dir == 1 else "sell"
        except Exception as e:
            logger.debug("Supertrend error: %s", e)
            return None, None

    # ------------------------------------------------------------------
    # Ichimoku Cloud (manual)
    # ------------------------------------------------------------------

    def ichimoku(self) -> Tuple:
        """Returns (tenkan, kijun, senkou_a, senkou_b)."""
        try:
            high, low = self.df["high"], self.df["low"]

            def mid_line(h, l, p):
                return (h.rolling(p).max() + l.rolling(p).min()) / 2

            tenkan   = mid_line(high, low, 9)
            kijun    = mid_line(high, low, 26)
            senkou_a = ((tenkan + kijun) / 2).shift(26)
            senkou_b = mid_line(high, low, 52).shift(26)

            return (
                _safe_float(tenkan.iloc[-1]),
                _safe_float(kijun.iloc[-1]),
                _safe_float(senkou_a.iloc[-1]),
                _safe_float(senkou_b.iloc[-1]),
            )
        except Exception as e:
            logger.debug("Ichimoku error: %s", e)
            return None, None, None, None

    # ------------------------------------------------------------------
    # Pivot Points (Classic)
    # ------------------------------------------------------------------

    def pivot_points(self) -> Tuple:
        """Returns (pivot, r1, r2, r3, s1, s2, s3)."""
        try:
            prev = self.df.iloc[-2] if len(self.df) >= 2 else self.df.iloc[-1]
            H = float(prev["high"])
            L = float(prev["low"])
            C = float(prev["close"])
            pp = (H + L + C) / 3
            r1 = 2 * pp - L
            r2 = pp + (H - L)
            r3 = H + 2 * (pp - L)
            s1 = 2 * pp - H
            s2 = pp - (H - L)
            s3 = L - 2 * (H - pp)
            return tuple(round(v, 2) for v in [pp, r1, r2, r3, s1, s2, s3])
        except Exception as e:
            logger.debug("Pivot error: %s", e)
            return tuple([None] * 7)

    # ------------------------------------------------------------------
    # Support / Resistance (swing)
    # ------------------------------------------------------------------

    def support_resistance(self) -> Tuple[Optional[float], Optional[float]]:
        try:
            w      = min(20, len(self.df))
            recent = self.df.tail(w)
            sup    = _safe_float(recent["low"].min())
            res    = _safe_float(recent["high"].max())
            return (round(sup, 2) if sup else None, round(res, 2) if res else None)
        except Exception as e:
            logger.debug("S/R error: %s", e)
            return None, None

    # ------------------------------------------------------------------
    # Stochastic RSI
    # ------------------------------------------------------------------

    def stoch_rsi(self, period: int = 14) -> Tuple[Optional[float], Optional[float]]:
        """Returns (%K, %D)."""
        try:
            if HAS_TA:
                ind = ta.momentum.StochRSIIndicator(
                    close=self.df["close"], window=period,
                    smooth1=3, smooth2=3
                )
                k = _safe_float(ind.stochrsi_k().iloc[-1])
                d = _safe_float(ind.stochrsi_d().iloc[-1])
            else:
                rsi_vals = _rsi_manual(self.df["close"], period)
                rsi_min  = rsi_vals.rolling(period).min()
                rsi_max  = rsi_vals.rolling(period).max()
                k_s = 100 * (rsi_vals - rsi_min) / (rsi_max - rsi_min).replace(0, np.nan)
                d_s = k_s.rolling(3).mean()
                k   = _safe_float(k_s.iloc[-1])
                d   = _safe_float(d_s.iloc[-1])

            def r2(v): return round(v, 2) if v is not None else None
            return r2(k), r2(d)
        except Exception as e:
            logger.debug("StochRSI error: %s", e)
            return None, None

    # ------------------------------------------------------------------
    # CCI
    # ------------------------------------------------------------------

    def cci(self, period: int = 20) -> Optional[float]:
        try:
            if HAS_TA:
                values = ta.trend.CCIIndicator(
                    high=self.df["high"], low=self.df["low"],
                    close=self.df["close"], window=period
                ).cci()
            else:
                typical = (self.df["high"] + self.df["low"] + self.df["close"]) / 3
                sma_tp  = typical.rolling(period).mean()
                mad     = typical.rolling(period).apply(
                    lambda x: np.abs(x - x.mean()).mean(), raw=True
                )
                values  = (typical - sma_tp) / (0.015 * mad)
            v = _safe_float(values.iloc[-1])
            return round(v, 2) if v is not None else None
        except Exception as e:
            logger.debug("CCI error: %s", e)
            return None

    # ------------------------------------------------------------------
    # OBV
    # ------------------------------------------------------------------

    def obv(self) -> Optional[float]:
        try:
            if HAS_TA:
                values = ta.volume.OnBalanceVolumeIndicator(
                    close=self.df["close"], volume=self.df["volume"]
                ).on_balance_volume()
            else:
                direction = np.sign(self.df["close"].diff()).fillna(0)
                values    = (direction * self.df["volume"]).cumsum()
            v = _safe_float(values.iloc[-1])
            return round(v, 0) if v is not None else None
        except Exception as e:
            logger.debug("OBV error: %s", e)
            return None

    # ------------------------------------------------------------------
    # Volume MA
    # ------------------------------------------------------------------

    def volume_ma(self, period: int = 20) -> Optional[float]:
        try:
            v = _safe_float(self.df["volume"].rolling(period).mean().iloc[-1])
            return round(v, 0) if v is not None else None
        except Exception as e:
            logger.debug("VolMA error: %s", e)
            return None

    # ------------------------------------------------------------------
    # Trend determination
    # ------------------------------------------------------------------

    def determine_trend(self, ema9, ema20, ema50, ema200, price) -> str:
        """Classify trend: bullish / bearish / sideways."""
        score = 0
        if ema9  and ema20  and ema9  > ema20:  score += 1
        if ema20 and ema50  and ema20 > ema50:  score += 1
        if ema50 and ema200 and ema50 > ema200: score += 1
        if price and ema50  and price > ema50:  score += 1
        if score >= 3:  return "bullish"
        if score <= 1:  return "bearish"
        return "sideways"
