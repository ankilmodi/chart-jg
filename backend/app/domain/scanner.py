import pandas as pd
from app.domain.scoring import AIScoreEngine

class QuantitativeScanner:
    """Quantitative Scanner & Screener Engine"""
    def __init__(self):
        self.score_engine = AIScoreEngine()

    def run_scan(self, stocks_data: list, preset: str = "strong_buy_futures") -> list:
        preset_key = preset.lower()
        results = []

        for stock in stocks_data:
            df = stock.get("df")
            if df is None or len(df) < 20:
                continue

            score_res = self.score_engine.calculate_score(df, stock["symbol"])
            score = score_res["totalScore"]
            details = score_res["details"]

            matches = False
            
            if preset_key == "strong_buy_futures":
                matches = (score >= 70) and details["ema"]["isAligned"]
            elif preset_key == "swing_buy":
                matches = (score >= 65) and details["rsi"]["isOptimalZone"]
            elif preset_key == "intraday_buy":
                matches = (score >= 60) and details["rvol"]["isHighVolume"]
            elif preset_key == "high_volume_breakout":
                matches = details["rvol"]["rvol"] >= 1.8 and score >= 60
            elif preset_key == "ema_crossover":
                matches = details["ema"]["isAboveEMA20"]
            elif preset_key == "supertrend_buy":
                matches = details["supertrend"]["isSuperTrendBuy"]
            elif preset_key == "macd_buy":
                matches = details["macd"]["isBullishCross"]
            elif preset_key == "rsi_momentum":
                matches = details["rsi"]["isOptimalZone"]
            elif preset_key == "bull_flag":
                matches = details["pattern"] == "Bull Flag" or score >= 75
            elif preset_key == "oi_long_buildup":
                matches = details["oiBuildUp"] == "Long Build-up"
            elif preset_key == "short_covering":
                matches = details["oiBuildUp"] == "Short Covering"
            elif preset_key == "near_52w_high":
                matches = stock.get("price", 0) >= stock.get("high", 0) * 0.95
            else:
                matches = score >= 60

            if matches:
                item = {**stock}
                item.pop("df", None)
                item["aiScore"] = score
                item["aiGrade"] = score_res["grade"]
                item["scoreBreakdown"] = score_res["breakdown"]
                results.append(item)

        results.sort(key=lambda x: x["aiScore"], reverse=True)
        return results
