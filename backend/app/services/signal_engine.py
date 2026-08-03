"""
Signal generation engine.
Evaluates all indicators and produces BUY / SELL / WAIT signals with confidence.
"""
from datetime import datetime, timezone
from typing import List, Tuple

from app.models.schemas import SignalReason, SignalResponse, IndicatorValues


# ---------------------------------------------------------------------------
# Point weights
# ---------------------------------------------------------------------------

WEIGHTS = {
    "ema_trend":   20,
    "macd":        15,
    "supertrend":  15,
    "rsi":         10,
    "adx":         10,
    "vwap":        10,
    "volume":      10,
    "support_res": 10,
    "bollinger":    5,
    "atr":          5,
}

TOTAL_WEIGHT = sum(WEIGHTS.values())  # 100


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _safe(v) -> bool:
    """Return True if value is not None / NaN."""
    if v is None:
        return False
    try:
        import math
        return not math.isnan(float(v))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Signal Engine
# ---------------------------------------------------------------------------

class SignalEngine:
    """
    Takes an IndicatorValues object + current price, returns SignalResponse.
    """

    def __init__(self, indicators: IndicatorValues, price: float):
        self.ind   = indicators
        self.price = price

    def compute(self) -> SignalResponse:
        buy_points  = 0
        sell_points = 0
        reasons: List[SignalReason] = []

        # ----------------------------------------------------------------
        # 1. EMA Trend (20 pts)
        # ----------------------------------------------------------------
        ema_bullish = self._ema_trend_bullish()
        ema_bearish = self._ema_trend_bearish()
        if ema_bullish:
            buy_points  += WEIGHTS["ema_trend"]
            reasons.append(SignalReason(
                indicator="EMA Trend",
                value=f"9>{self.ind.ema20:.0f} > {self.ind.ema50:.0f} > {self.ind.ema200:.0f}" if all(_safe(x) for x in [self.ind.ema9, self.ind.ema20, self.ind.ema50, self.ind.ema200]) else "Bullish stack",
                points=WEIGHTS["ema_trend"],
                max_points=WEIGHTS["ema_trend"],
                bullish=True,
            ))
        elif ema_bearish:
            sell_points += WEIGHTS["ema_trend"]
            reasons.append(SignalReason(
                indicator="EMA Trend",
                value="Bearish stack",
                points=WEIGHTS["ema_trend"],
                max_points=WEIGHTS["ema_trend"],
                bullish=False,
            ))
        else:
            reasons.append(SignalReason(
                indicator="EMA Trend",
                value="Mixed / Sideways",
                points=0,
                max_points=WEIGHTS["ema_trend"],
                bullish=False,
            ))

        # ----------------------------------------------------------------
        # 2. MACD (15 pts)
        # ----------------------------------------------------------------
        if _safe(self.ind.macd):
            if self.ind.macd_crossover == "bullish":
                buy_points += WEIGHTS["macd"]
                reasons.append(SignalReason(
                    indicator="MACD",
                    value=f"Bullish crossover | hist={self.ind.macd_hist:.4f}",
                    points=WEIGHTS["macd"],
                    max_points=WEIGHTS["macd"],
                    bullish=True,
                ))
            elif self.ind.macd_crossover == "bearish":
                sell_points += WEIGHTS["macd"]
                reasons.append(SignalReason(
                    indicator="MACD",
                    value=f"Bearish crossover | hist={self.ind.macd_hist:.4f}",
                    points=WEIGHTS["macd"],
                    max_points=WEIGHTS["macd"],
                    bullish=False,
                ))
            else:
                reasons.append(SignalReason(
                    indicator="MACD",
                    value=f"Neutral | hist={self.ind.macd_hist:.4f}" if _safe(self.ind.macd_hist) else "Neutral",
                    points=0,
                    max_points=WEIGHTS["macd"],
                    bullish=False,
                ))

        # ----------------------------------------------------------------
        # 3. Supertrend (15 pts)
        # ----------------------------------------------------------------
        if self.ind.supertrend_direction:
            if self.ind.supertrend_direction == "buy":
                buy_points += WEIGHTS["supertrend"]
                reasons.append(SignalReason(
                    indicator="Supertrend",
                    value=f"BUY signal @ {self.ind.supertrend}",
                    points=WEIGHTS["supertrend"],
                    max_points=WEIGHTS["supertrend"],
                    bullish=True,
                ))
            else:
                sell_points += WEIGHTS["supertrend"]
                reasons.append(SignalReason(
                    indicator="Supertrend",
                    value=f"SELL signal @ {self.ind.supertrend}",
                    points=WEIGHTS["supertrend"],
                    max_points=WEIGHTS["supertrend"],
                    bullish=False,
                ))

        # ----------------------------------------------------------------
        # 4. RSI (10 pts)
        # ----------------------------------------------------------------
        if _safe(self.ind.rsi14):
            rsi = self.ind.rsi14
            if 55 <= rsi <= 70:
                buy_points += WEIGHTS["rsi"]
                reasons.append(SignalReason(
                    indicator="RSI 14",
                    value=f"{rsi:.1f} (Bullish zone 55-70)",
                    points=WEIGHTS["rsi"],
                    max_points=WEIGHTS["rsi"],
                    bullish=True,
                ))
            elif rsi < 45:
                sell_points += WEIGHTS["rsi"]
                reasons.append(SignalReason(
                    indicator="RSI 14",
                    value=f"{rsi:.1f} (Bearish zone <45)",
                    points=WEIGHTS["rsi"],
                    max_points=WEIGHTS["rsi"],
                    bullish=False,
                ))
            elif rsi > 70:
                reasons.append(SignalReason(
                    indicator="RSI 14",
                    value=f"{rsi:.1f} (Overbought >70)",
                    points=0,
                    max_points=WEIGHTS["rsi"],
                    bullish=False,
                ))
            else:
                reasons.append(SignalReason(
                    indicator="RSI 14",
                    value=f"{rsi:.1f} (Neutral 45-55)",
                    points=0,
                    max_points=WEIGHTS["rsi"],
                    bullish=False,
                ))

        # ----------------------------------------------------------------
        # 5. ADX (10 pts)
        # ----------------------------------------------------------------
        if _safe(self.ind.adx):
            adx = self.ind.adx
            if adx > 25:
                if _safe(self.ind.adx_plus_di) and _safe(self.ind.adx_minus_di):
                    if self.ind.adx_plus_di > self.ind.adx_minus_di:
                        buy_points += WEIGHTS["adx"]
                        reasons.append(SignalReason(
                            indicator="ADX",
                            value=f"{adx:.1f} strong | +DI>{self.ind.adx_plus_di:.1f} > -DI{self.ind.adx_minus_di:.1f}",
                            points=WEIGHTS["adx"],
                            max_points=WEIGHTS["adx"],
                            bullish=True,
                        ))
                    else:
                        sell_points += WEIGHTS["adx"]
                        reasons.append(SignalReason(
                            indicator="ADX",
                            value=f"{adx:.1f} strong | -DI{self.ind.adx_minus_di:.1f} > +DI{self.ind.adx_plus_di:.1f}",
                            points=WEIGHTS["adx"],
                            max_points=WEIGHTS["adx"],
                            bullish=False,
                        ))
                else:
                    reasons.append(SignalReason(
                        indicator="ADX",
                        value=f"{adx:.1f} strong trend",
                        points=0,
                        max_points=WEIGHTS["adx"],
                        bullish=False,
                    ))
            else:
                reasons.append(SignalReason(
                    indicator="ADX",
                    value=f"{adx:.1f} (Weak trend <25)",
                    points=0,
                    max_points=WEIGHTS["adx"],
                    bullish=False,
                ))

        # ----------------------------------------------------------------
        # 6. VWAP (10 pts)
        # ----------------------------------------------------------------
        if _safe(self.ind.vwap):
            if self.price > self.ind.vwap:
                buy_points += WEIGHTS["vwap"]
                reasons.append(SignalReason(
                    indicator="VWAP",
                    value=f"Price {self.price:.2f} > VWAP {self.ind.vwap:.2f}",
                    points=WEIGHTS["vwap"],
                    max_points=WEIGHTS["vwap"],
                    bullish=True,
                ))
            else:
                sell_points += WEIGHTS["vwap"]
                reasons.append(SignalReason(
                    indicator="VWAP",
                    value=f"Price {self.price:.2f} < VWAP {self.ind.vwap:.2f}",
                    points=WEIGHTS["vwap"],
                    max_points=WEIGHTS["vwap"],
                    bullish=False,
                ))

        # ----------------------------------------------------------------
        # 7. Volume (10 pts)
        # ----------------------------------------------------------------
        if _safe(self.ind.volume_ratio):
            if self.ind.volume_ratio > 1.2:
                vol_bullish = ema_bullish or (self.ind.macd_crossover == "bullish")
                reasons.append(SignalReason(
                    indicator="Volume",
                    value=f"{self.ind.volume_ratio:.2f}x 20-day avg (High volume)",
                    points=WEIGHTS["volume"],
                    max_points=WEIGHTS["volume"],
                    bullish=vol_bullish,
                ))
                if vol_bullish:
                    buy_points += WEIGHTS["volume"]
                else:
                    sell_points += WEIGHTS["volume"]
            else:
                reasons.append(SignalReason(
                    indicator="Volume",
                    value=f"{self.ind.volume_ratio:.2f}x 20-day avg (Normal)",
                    points=0,
                    max_points=WEIGHTS["volume"],
                    bullish=False,
                ))

        # ----------------------------------------------------------------
        # 8. Support / Resistance (10 pts)
        # ----------------------------------------------------------------
        if _safe(self.ind.resistance) and _safe(self.ind.support):
            if self.price > self.ind.resistance:
                buy_points += WEIGHTS["support_res"]
                reasons.append(SignalReason(
                    indicator="Support/Resistance",
                    value=f"Breakout above resistance {self.ind.resistance:.2f}",
                    points=WEIGHTS["support_res"],
                    max_points=WEIGHTS["support_res"],
                    bullish=True,
                ))
            elif self.price < self.ind.support:
                sell_points += WEIGHTS["support_res"]
                reasons.append(SignalReason(
                    indicator="Support/Resistance",
                    value=f"Breakdown below support {self.ind.support:.2f}",
                    points=WEIGHTS["support_res"],
                    max_points=WEIGHTS["support_res"],
                    bullish=False,
                ))
            else:
                reasons.append(SignalReason(
                    indicator="Support/Resistance",
                    value=f"Inside range S={self.ind.support:.2f} R={self.ind.resistance:.2f}",
                    points=0,
                    max_points=WEIGHTS["support_res"],
                    bullish=False,
                ))

        # ----------------------------------------------------------------
        # 9. Bollinger Bands (5 pts)
        # ----------------------------------------------------------------
        if _safe(self.ind.bb_upper) and _safe(self.ind.bb_lower) and _safe(self.ind.bb_middle):
            if self.price > self.ind.bb_middle:
                buy_points += WEIGHTS["bollinger"]
                reasons.append(SignalReason(
                    indicator="Bollinger Bands",
                    value=f"Price above mid-band {self.ind.bb_middle:.2f}",
                    points=WEIGHTS["bollinger"],
                    max_points=WEIGHTS["bollinger"],
                    bullish=True,
                ))
            elif self.price < self.ind.bb_middle:
                sell_points += WEIGHTS["bollinger"]
                reasons.append(SignalReason(
                    indicator="Bollinger Bands",
                    value=f"Price below mid-band {self.ind.bb_middle:.2f}",
                    points=WEIGHTS["bollinger"],
                    max_points=WEIGHTS["bollinger"],
                    bullish=False,
                ))

        # ----------------------------------------------------------------
        # 10. ATR (5 pts – trend-confirmation only)
        # ----------------------------------------------------------------
        if _safe(self.ind.atr):
            atr_pct = (self.ind.atr / self.price) * 100 if self.price else 0
            if atr_pct > 0.3:
                reasons.append(SignalReason(
                    indicator="ATR",
                    value=f"{self.ind.atr:.2f} ({atr_pct:.2f}% volatility – active market)",
                    points=WEIGHTS["atr"],
                    max_points=WEIGHTS["atr"],
                    bullish=ema_bullish,
                ))
                if ema_bullish:
                    buy_points += WEIGHTS["atr"]
                else:
                    sell_points += WEIGHTS["atr"]
            else:
                reasons.append(SignalReason(
                    indicator="ATR",
                    value=f"{self.ind.atr:.2f} (Low volatility)",
                    points=0,
                    max_points=WEIGHTS["atr"],
                    bullish=False,
                ))

        # ----------------------------------------------------------------
        # Determine signal
        # ----------------------------------------------------------------
        total = buy_points + sell_points
        if total == 0:
            confidence = 0.0
            signal = "WAIT"
            trend  = "sideways"
        else:
            if buy_points > sell_points and buy_points >= 35:
                signal = "BUY"
                confidence = round((buy_points / TOTAL_WEIGHT) * 100, 1)
                trend = "bullish"
            elif sell_points > buy_points and sell_points >= 35:
                signal = "SELL"
                confidence = round((sell_points / TOTAL_WEIGHT) * 100, 1)
                trend = "bearish"
            else:
                signal = "WAIT"
                confidence = round((max(buy_points, sell_points) / TOTAL_WEIGHT) * 100, 1)
                trend = "sideways"

        return SignalResponse(
            signal=signal,
            confidence=min(confidence, 100.0),
            trend=trend,
            price=self.price,
            reasons=reasons,
            buy_score=buy_points,
            sell_score=sell_points,
            last_updated=_now(),
        )

    # ----------------------------------------------------------------
    # Internal helpers
    # ----------------------------------------------------------------

    def _ema_trend_bullish(self) -> bool:
        ind = self.ind
        checks = [
            _safe(ind.ema9) and _safe(ind.ema20)  and ind.ema9  > ind.ema20,
            _safe(ind.ema20) and _safe(ind.ema50)  and ind.ema20 > ind.ema50,
            _safe(ind.ema50) and _safe(ind.ema200) and ind.ema50 > ind.ema200,
        ]
        return sum(checks) >= 2

    def _ema_trend_bearish(self) -> bool:
        ind = self.ind
        checks = [
            _safe(ind.ema9) and _safe(ind.ema20)  and ind.ema9  < ind.ema20,
            _safe(ind.ema20) and _safe(ind.ema50)  and ind.ema20 < ind.ema50,
            _safe(ind.ema50) and _safe(ind.ema200) and ind.ema50 < ind.ema200,
        ]
        return sum(checks) >= 2
