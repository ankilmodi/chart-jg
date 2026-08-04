"""
IPO Apply Assistant – 100-Point Scoring Engine (No Database, dict-based)
"""
from __future__ import annotations
from typing import Optional, Dict, Any, List


# ─── Score Components ────────────────────────────────────────────────────────

def _gmp_score(gmp_pct: Optional[float]) -> float:
    if gmp_pct is None: return 5.0
    if gmp_pct >= 50:   return 20.0
    if gmp_pct >= 30:   return 17.0
    if gmp_pct >= 20:   return 14.0
    if gmp_pct >= 10:   return 10.0
    if gmp_pct >= 5:    return 7.0
    if gmp_pct >= 0:    return 4.0
    return 0.0


def _sub_score(times: Optional[float], max_pts: float) -> float:
    if not times: return 0.0
    if times >= 80:  return max_pts
    if times >= 50:  return max_pts * 0.88
    if times >= 30:  return max_pts * 0.75
    if times >= 15:  return max_pts * 0.60
    if times >= 5:   return max_pts * 0.45
    if times >= 2:   return max_pts * 0.25
    if times >= 1:   return max_pts * 0.10
    return 0.0


def _fin_score(rev_g: Optional[float], prof_g: Optional[float]) -> float:
    s = 0.0
    rg = rev_g or 0.0
    pg = prof_g or 0.0
    s += 5.0 if rg >= 30 else 3.5 if rg >= 20 else 2.0 if rg >= 10 else 1.0 if rg > 0 else 0.0
    s += 5.0 if pg >= 50 else 3.5 if pg >= 30 else 2.0 if pg >= 15 else 1.0 if pg > 0 else 0.0
    return min(10.0, s)


def _profit_score(pg: Optional[float], roe: Optional[float]) -> float:
    if pg is None or pg < 0: return 0.0
    if pg >= 50 or (roe and roe >= 20): return 5.0
    if pg >= 20: return 3.5
    return 2.0


def _roe_score(roe: Optional[float]) -> float:
    if roe is None: return 2.0
    if roe >= 25:   return 5.0
    if roe >= 18:   return 4.0
    if roe >= 12:   return 3.0
    if roe >= 6:    return 2.0
    if roe >= 0:    return 1.0
    return 0.0


def _industry_score(sector: Optional[str]) -> float:
    HOT    = {"IT Services","Renewable Energy","EV","Defence","AI","Semiconductor","Space Tech","Healthcare IT","Travel Tech","Fintech"}
    WARM   = {"NBFC","Banking","Pharma","Healthcare","Retail","Consumer","Insurance","Paints & Coatings","Electric Vehicles"}
    COLD   = {"Coal","Tobacco","Textile"}
    if not sector: return 3.0
    s = sector.lower()
    if any(h.lower() in s for h in HOT):  return 5.0
    if any(w.lower() in s for w in WARM): return 4.0
    if any(c.lower() in s for c in COLD): return 1.0
    return 3.0


# ─── Best Time Logic ─────────────────────────────────────────────────────────

def _best_time(score: float, status: str, retail: float) -> str:
    if score >= 88:
        return "Apply Day 1"          # hot IPO – apply immediately
    if score >= 75 and retail < 5:
        return "Apply Last Day Morning"
    if score >= 75:
        return "Apply Last Hour"
    if retail >= 10:
        return "Apply Last Hour"
    if status == "Open":
        return "Apply Last Day Morning"
    return "Apply Day 1"


# ─── Allotment Probability ────────────────────────────────────────────────────

def _allotment_prob(retail: float) -> tuple:
    if retail <= 0:   return 80.0, "High"
    if retail < 5:    return 85.0, "High"
    if retail < 15:   return 55.0, "Medium"
    if retail < 35:   return 25.0, "Low"
    return round(max(4.0, 100 / retail), 1), "Low"


# ─── AI Recommendation ───────────────────────────────────────────────────────

def _ai_rec(ipo: Dict, breakdown: Dict) -> tuple:
    reasons = []
    avoid   = []
    total   = breakdown["total"]
    gmp_pct = ipo.get("gmp_pct") or 0.0
    sub     = ipo.get("subscription") or {}
    retail  = sub.get("retail_times") or 0.0
    qib     = sub.get("qib_times")    or 0.0
    pg      = ipo.get("profit_growth_pct")
    roe     = ipo.get("roe")
    sector  = ipo.get("sector", "")

    # Positives
    if gmp_pct >= 20:   reasons.append(f"Strong GMP {gmp_pct:.1f}% signals high listing gain")
    if retail >= 10:    reasons.append(f"Retail oversubscribed {retail:.1f}x — strong demand")
    if qib >= 15:       reasons.append(f"QIB subscription {qib:.1f}x — institutional confidence")
    if (pg or 0) >= 30: reasons.append(f"Profit growth {pg:.0f}% — strong financials")
    if (roe or 0) >= 18:reasons.append(f"ROE {roe:.1f}% — efficient capital use")
    if breakdown["industry_trend_score"] >= 4.5:
        reasons.append(f"'{sector}' sector in strong growth trend")
    if gmp_pct >= 30:   reasons.append("Market expects significant listing premium")

    # Negatives
    if gmp_pct < 0:     avoid.append(f"Negative GMP {gmp_pct:.1f}% — listing loss expected")
    if (pg or 1) < 0:   avoid.append("Company is loss-making — high risk")
    if (roe or 0) < 0:  avoid.append(f"Negative ROE {roe:.1f}% — return below zero")
    if retail < 1 and ipo.get("status") in ("Open", "Closed"):
        avoid.append("Undersubscribed retail — poor demand signal")
    if ipo.get("debt_equity", 0) and ipo["debt_equity"] > 3:
        avoid.append("High debt-to-equity ratio increases financial risk")

    # Decision
    if total >= 85 and not avoid:
        rec = "Apply"
    elif total >= 72 and len(avoid) <= 1:
        rec = "Apply"
    elif total >= 58:
        rec = "Wait"
        if not reasons:
            reasons.append("Moderate rating — monitor subscription on last day")
    else:
        rec = "Avoid"
        if not avoid:
            avoid.append("Low overall score — risk outweighs expected reward")

    return rec, reasons, avoid


# ─── Main Entry Point ─────────────────────────────────────────────────────────

def compute_rating_from_dict(ipo: Dict) -> Dict:
    """Compute full 100-point IPO rating from a plain dict."""
    sub    = ipo.get("subscription") or {}
    retail = sub.get("retail_times") or 0.0
    hni    = sub.get("hni_times")    or 0.0
    qib    = sub.get("qib_times")    or 0.0

    breakdown = {
        "gmp_score":             _gmp_score(ipo.get("gmp_pct")),
        "retail_score":          _sub_score(retail, 20.0),
        "hni_score":             _sub_score(hni, 15.0),
        "qib_score":             _sub_score(qib, 20.0),
        "financial_growth_score":_fin_score(ipo.get("revenue_growth_pct"), ipo.get("profit_growth_pct")),
        "profitability_score":   _profit_score(ipo.get("profit_growth_pct"), ipo.get("roe")),
        "roe_score":             _roe_score(ipo.get("roe")),
        "industry_trend_score":  _industry_score(ipo.get("sector")),
    }
    total = round(sum(breakdown.values()), 1)
    breakdown["total"] = total

    label = ("Excellent" if total >= 90 else "Very Good" if total >= 80
             else "Good" if total >= 70 else "Risky")

    status = ipo.get("status", "")
    best_time = _best_time(total, status, retail)
    prob_pct, prob_label = _allotment_prob(retail)
    rec, reasons, avoid  = _ai_rec(ipo, breakdown)

    return {
        "ipo_id":                  ipo.get("id", ""),
        "score":                   total,
        "label":                   label,
        "breakdown":               breakdown,
        "best_time_to_apply":      best_time,
        "apply_probability":       prob_label,
        "allotment_probability_pct": prob_pct,
        "recommendation":          rec,
        "recommendation_reasons":  reasons,
        "avoid_reasons":           avoid,
    }
