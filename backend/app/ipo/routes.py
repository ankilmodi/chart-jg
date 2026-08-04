"""
IPO Apply Assistant – REST API Routes (No Database, Live/Offline API only)
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Body

from app.ipo.fetcher import (
    get_ipo_list, get_ipo_detail, get_ipo_history, force_refresh
)
from app.ipo.scorer import compute_rating_from_dict

logger = logging.getLogger(__name__)
router = APIRouter()

def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


# ─── IPO List ────────────────────────────────────────────────────────────────

@router.get("/ipo/list", tags=["ipo"])
async def api_ipo_list(
    status:     Optional[str]   = Query(None),
    type:       Optional[str]   = Query(None),
    search:     Optional[str]   = Query(None),
    min_gmp:    Optional[float] = Query(None),
    min_sub:    Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    page:       int = Query(1, ge=1),
    limit:      int = Query(25, le=100),
):
    ipos = get_ipo_list(status=status, issue_type=type, search=search,
                        min_gmp=min_gmp, min_sub=min_sub)

    # Add rating to each IPO
    for ipo in ipos:
        r = compute_rating_from_dict(ipo)
        ipo["rating"]       = r["score"]
        ipo["rating_label"] = r["label"]
        ipo["recommendation"] = r["recommendation"]

    # Filter by rating
    if min_rating is not None:
        ipos = [i for i in ipos if (i.get("rating") or 0) >= min_rating]

    total = len(ipos)
    start = (page - 1) * limit
    return {
        "ipos":      ipos[start:start+limit],
        "total":     total,
        "page":      page,
        "limit":     limit,
        "timestamp": _now(),
    }


# ─── IPO Detail ──────────────────────────────────────────────────────────────

@router.get("/ipo/{ipo_id}", tags=["ipo"])
async def api_ipo_detail(ipo_id: str):
    detail = get_ipo_detail(ipo_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"IPO '{ipo_id}' not found")
    rating = compute_rating_from_dict(detail)
    return {
        "ipo":         detail,
        "rating":      rating,
        "timestamp":   _now(),
    }


# ─── Subscription ─────────────────────────────────────────────────────────────

@router.get("/ipo/{ipo_id}/subscription", tags=["ipo"])
async def api_subscription(ipo_id: str):
    detail = get_ipo_detail(ipo_id)
    if not detail:
        raise HTTPException(status_code=404, detail="IPO not found")
    return {
        "ipo_id":    ipo_id,
        "days":      detail.get("subscription_days", []),
        "hourly":    detail.get("subscription_hourly", []),
        "summary":   detail.get("subscription", {}),
        "timestamp": _now(),
    }


# ─── GMP Trend ───────────────────────────────────────────────────────────────

@router.get("/ipo/{ipo_id}/gmp-trend", tags=["ipo"])
async def api_gmp_trend(ipo_id: str):
    detail = get_ipo_detail(ipo_id)
    if not detail:
        raise HTTPException(status_code=404, detail="IPO not found")
    hist = detail.get("gmp_history", [])
    return {
        "ipo_id":       ipo_id,
        "gmp_history":  hist,
        "latest_gmp":     hist[-1]["gmp"]     if hist else None,
        "latest_gmp_pct": hist[-1]["gmp_pct"] if hist else None,
        "timestamp":    _now(),
    }


# ─── Rating ───────────────────────────────────────────────────────────────────

@router.get("/ipo/{ipo_id}/rating", tags=["ipo"])
async def api_rating(ipo_id: str):
    detail = get_ipo_detail(ipo_id)
    if not detail:
        raise HTTPException(status_code=404, detail="IPO not found")
    rating = compute_rating_from_dict(detail)
    return {**rating, "timestamp": _now()}


# ─── Recommendation ───────────────────────────────────────────────────────────

@router.get("/ipo/{ipo_id}/recommendation", tags=["ipo"])
async def api_recommendation(ipo_id: str):
    detail = get_ipo_detail(ipo_id)
    if not detail:
        raise HTTPException(status_code=404, detail="IPO not found")
    rating = compute_rating_from_dict(detail)
    return {
        "ipo_id":                   ipo_id,
        "company_name":             detail.get("company_name"),
        "recommendation":           rating["recommendation"],
        "score":                    rating["score"],
        "label":                    rating["label"],
        "best_time_to_apply":       rating["best_time_to_apply"],
        "apply_probability":        rating["apply_probability"],
        "allotment_probability_pct":rating["allotment_probability_pct"],
        "reasons":                  rating["recommendation_reasons"],
        "avoid_reasons":            rating["avoid_reasons"],
        "timestamp":                _now(),
    }


# ─── Historical IPO Database ──────────────────────────────────────────────────

@router.get("/ipo/history/all", tags=["ipo"])
async def api_history(limit: int = Query(100, le=500)):
    history = get_ipo_history()[:limit]
    gains   = [h["listing_gain_pct"] for h in history if h.get("listing_gain_pct") is not None]
    return {
        "history":          history,
        "total":            len(history),
        "avg_listing_gain": round(sum(gains)/len(gains), 2) if gains else 0.0,
        "best_gain":        max(gains) if gains else 0.0,
        "worst_gain":       min(gains) if gains else 0.0,
        "timestamp":        _now(),
    }


# ─── Admin ────────────────────────────────────────────────────────────────────

@router.post("/ipo/admin/refresh", tags=["ipo-admin"])
async def api_force_refresh():
    force_refresh()
    ipos = get_ipo_list()
    return {"status": "refreshed", "count": len(ipos), "timestamp": _now()}
