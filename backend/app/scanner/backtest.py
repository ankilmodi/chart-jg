"""
Backtesting Engine for the Weekly Profit Scanner.
Replays the weekly scanner strategy on historical NIFTY 50 data.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import numpy as np
import pandas as pd

from app.scanner.schemas import BacktestResult, BacktestTrade
from app.scanner.market_data import fetch_daily
from app.scanner.indicators import compute_all
from app.scanner.scoring import score_stock, compute_levels, recommendation
from app.scanner.universe import NIFTY50

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _sharpe(returns: pd.Series, rf: float = 0.06) -> float:
    if len(returns) < 2 or returns.std() == 0:
        return 0.0
    excess = returns - (rf / 52)
    return round(float(excess.mean() / excess.std() * np.sqrt(52)), 3)


def _max_drawdown(equity: pd.Series) -> float:
    peak = equity.cummax()
    dd   = (equity - peak) / peak
    return round(float(dd.min() * 100), 2)


def _cagr(start: float, end: float, years: float) -> float:
    if start <= 0 or years <= 0:
        return 0.0
    return round(((end / start) ** (1 / years) - 1) * 100, 2)


def run_backtest(
    years: int = 3,
    capital: float = 100000.0,
    min_score: float = 70.0,
) -> BacktestResult:
    """
    Backtest strategy on NIFTY 50 universe.
    For each Monday in the period:
      - Compute indicators on data available up to that day
      - Score stocks, pick top qualifiers
      - Simulate holding until Friday
      - Record outcome
    All data fetched live from Yahoo Finance.
    """
    logger.info("Starting backtest: %d years, min_score=%.0f", years, min_score)

    nifty_df = fetch_daily("^NSEI", period=f"{years * 365 + 60}d")
    if nifty_df is None or nifty_df.empty:
        raise ValueError("Cannot fetch NIFTY historical data")

    stock_data: dict = {}
    for stock in NIFTY50[:20]:   # Top 20 for speed
        df = fetch_daily(stock.ticker, period=f"{years * 365 + 60}d")
        if df is not None and len(df) > 60:
            stock_data[stock.ticker] = df

    if not stock_data:
        raise ValueError("No historical stock data available")

    logger.info("Loaded %d stocks for backtest", len(stock_data))

    end_date   = nifty_df.index[-1].to_pydatetime().replace(tzinfo=None)
    start_date = end_date - timedelta(days=years * 365)
    all_dates  = pd.bdate_range(start=start_date, end=end_date, freq="W-MON")

    trades: List[BacktestTrade] = []
    weekly_equity   = [capital]
    equity          = capital
    total_wins      = 0
    total_losses    = 0
    all_returns     = []

    for monday in all_dates:
        monday_ts = pd.Timestamp(monday).tz_localize("UTC")

        nifty_slice = nifty_df[nifty_df.index <= monday_ts]
        if len(nifty_slice) < 50:
            continue

        nifty_ind     = compute_all(nifty_slice)
        nifty_price   = float(nifty_slice["close"].iloc[-1])
        nifty_ema200  = nifty_ind.get("ema200") or 0
        nifty_vwap    = nifty_ind.get("vwap")   or 0
        market_bullish = (nifty_price > nifty_ema200) and (nifty_price > nifty_vwap)

        if not market_bullish:
            weekly_equity.append(equity)
            continue

        week_picks = []
        for stock in NIFTY50[:20]:
            df = stock_data.get(stock.ticker)
            if df is None:
                continue
            slice_ = df[df.index <= monday_ts]
            if len(slice_) < 50:
                continue
            try:
                ind   = compute_all(slice_)
                price = ind.get("price")
                if not price:
                    continue
                c      = slice_["close"]
                s5d    = float(((c.iloc[-1] - c.iloc[-6]) / c.iloc[-6]) * 100) if len(c) >= 6 else 0
                n5d    = float(((nifty_slice["close"].iloc[-1] - nifty_slice["close"].iloc[-6]) / nifty_slice["close"].iloc[-6]) * 100) if len(nifty_slice) >= 6 else 0

                bd, reasons, rejects, qualified = score_stock(
                    ind=ind, price=price,
                    market_bullish=True,
                    sector_rank=0.6,
                    nifty_return_5d=n5d,
                    stock_return_5d=s5d,
                )
                if not qualified or bd.total < min_score:
                    continue

                levels = compute_levels(price=price, atr=ind.get("atr"), ind=ind, capital=equity)
                if levels["risk_reward_ratio"] < 2.0:
                    continue

                week_picks.append({
                    "stock": stock,
                    "price": price,
                    "levels": levels,
                    "score": bd.total,
                    "df": df,
                    "slice_end": monday_ts,
                })
            except Exception:
                continue

        week_picks.sort(key=lambda x: x["score"], reverse=True)
        week_picks = week_picks[:5]

        friday_ts   = monday_ts + timedelta(days=4)
        week_return = 0.0

        for pick in week_picks:
            df     = pick["df"]
            entry  = pick["price"]
            target = pick["levels"]["target_price"]
            sl     = pick["levels"]["stop_loss"]
            score  = pick["score"]
            stock  = pick["stock"]

            week_data = df[(df.index > monday_ts) & (df.index <= friday_ts + timedelta(days=2))]
            if week_data.empty:
                continue

            outcome    = "HOLD"
            exit_price = float(week_data["close"].iloc[-1])
            days_held  = len(week_data)

            for _, row in week_data.iterrows():
                if row["high"] >= target:
                    exit_price = target
                    outcome    = "WIN"
                    break
                if row["low"] <= sl:
                    exit_price = sl
                    outcome    = "LOSS"
                    break
            else:
                ret_pct = ((exit_price - entry) / entry) * 100
                outcome = "WIN" if ret_pct > 0 else "LOSS"

            ret_pct  = round(((exit_price - entry) / entry) * 100, 2)
            week_return += ret_pct

            trades.append(BacktestTrade(
                week_start=monday.strftime("%Y-%m-%d"),
                symbol=stock.symbol,
                entry_price=round(entry, 2),
                exit_price=round(exit_price, 2),
                target=round(target, 2),
                stop_loss=round(sl, 2),
                return_pct=ret_pct,
                outcome=outcome,
                holding_days=days_held,
                confidence_score=round(score, 1),
            ))

            if outcome == "WIN":
                total_wins   += 1
                equity       *= (1 + ret_pct / 100 * 0.2)
            else:
                total_losses += 1
                equity       *= (1 + ret_pct / 100 * 0.2)

        if week_picks:
            all_returns.append(week_return / max(len(week_picks), 1))
        weekly_equity.append(round(equity, 2))

    equity_series  = pd.Series(weekly_equity)
    returns_series = pd.Series(all_returns) if all_returns else pd.Series([0.0])

    total_trades = len(trades)
    if total_trades == 0:
        raise ValueError("No trades generated — adjust min_score or date range")

    win_rate      = round((total_wins / total_trades) * 100, 1)
    wins_only     = [t.return_pct for t in trades if t.outcome == "WIN"]
    losses_only   = [t.return_pct for t in trades if t.outcome != "WIN"]
    avg_win       = round(float(np.mean(wins_only)),   2) if wins_only  else 0
    avg_loss      = round(float(np.mean(losses_only)), 2) if losses_only else 0
    profit_factor = round(abs(sum(wins_only) / sum(losses_only)), 2) if sum(losses_only) != 0 else 99.0

    return BacktestResult(
        period=f"{years} years",
        total_trades=total_trades,
        winning_trades=total_wins,
        losing_trades=total_losses,
        win_rate=win_rate,
        total_return_pct=round(((equity - capital) / capital) * 100, 2),
        cagr=_cagr(capital, equity, years),
        max_drawdown=_max_drawdown(equity_series),
        sharpe_ratio=_sharpe(returns_series),
        avg_weekly_return=round(float(returns_series.mean()), 3),
        profit_factor=profit_factor,
        avg_win_pct=avg_win,
        avg_loss_pct=avg_loss,
        best_trade_pct=round(max((t.return_pct for t in trades), default=0), 2),
        worst_trade_pct=round(min((t.return_pct for t in trades), default=0), 2),
        trades=trades[-100:],
        equity_curve=[
            {"week": i, "equity": round(v, 2)}
            for i, v in enumerate(weekly_equity[-104:])
        ],
        timestamp=_now(),
    )
