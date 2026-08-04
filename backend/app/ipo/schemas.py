"""
IPO Apply Assistant – Pydantic Schemas
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Core IPO models
# ---------------------------------------------------------------------------

class IPOMaster(BaseModel):
    id: str
    company_name: str
    symbol: Optional[str] = None
    issue_type: str = "Mainboard"          # Mainboard | SME
    status: str = "Upcoming"              # Upcoming | Open | Closed | Listed
    issue_price_min: Optional[float] = None
    issue_price_max: Optional[float] = None
    issue_price: Optional[float] = None   # final / centre price
    issue_size: Optional[float] = None    # in crores
    lot_size: Optional[int] = None
    min_investment: Optional[float] = None
    open_date: Optional[str] = None
    close_date: Optional[str] = None
    allotment_date: Optional[str] = None
    listing_date: Optional[str] = None
    listing_price: Optional[float] = None
    listing_gain_pct: Optional[float] = None
    registrar: Optional[str] = None
    lead_managers: Optional[List[str]] = []
    sector: Optional[str] = None
    exchange: Optional[str] = "NSE"       # NSE | BSE | NSE+BSE
    face_value: Optional[float] = 10.0
    pre_ipo_placement: Optional[float] = None
    # GMP
    gmp: Optional[float] = None           # Grey Market Premium (Rs)
    gmp_pct: Optional[float] = None
    gmp_updated_at: Optional[str] = None
    # Financials
    revenue_growth_pct: Optional[float] = None
    profit_growth_pct: Optional[float] = None
    roe: Optional[float] = None
    roce: Optional[float] = None
    pe_ratio: Optional[float] = None
    debt_equity: Optional[float] = None
    # Rating
    rating: Optional[float] = None
    rating_label: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class IPOSubscriptionDay(BaseModel):
    day: int                              # 1, 2, 3
    date: Optional[str] = None
    retail_times: Optional[float] = 0.0
    hni_times: Optional[float] = 0.0
    qib_times: Optional[float] = 0.0
    employee_times: Optional[float] = 0.0
    total_times: Optional[float] = 0.0
    applications: Optional[int] = 0


class IPOSubscriptionHourly(BaseModel):
    timestamp: str
    total_times: float = 0.0
    retail_times: float = 0.0


class IPOSubscription(BaseModel):
    ipo_id: str
    days: List[IPOSubscriptionDay] = []
    hourly: List[IPOSubscriptionHourly] = []
    retail_times: Optional[float] = 0.0
    hni_times: Optional[float] = 0.0
    qib_times: Optional[float] = 0.0
    employee_times: Optional[float] = 0.0
    total_times: Optional[float] = 0.0
    total_applications: Optional[int] = 0
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class IPOGMPEntry(BaseModel):
    ipo_id: str
    timestamp: str
    gmp: float
    gmp_pct: float
    kostak: Optional[float] = None        # subject to sauda
    subject_to_sauda_pct: Optional[float] = None


class IPOScoreBreakdown(BaseModel):
    gmp_score: float = 0.0
    retail_score: float = 0.0
    hni_score: float = 0.0
    qib_score: float = 0.0
    financial_growth_score: float = 0.0
    profitability_score: float = 0.0
    roe_score: float = 0.0
    industry_trend_score: float = 0.0
    total: float = 0.0


class IPORating(BaseModel):
    ipo_id: str
    score: float = 0.0
    label: str = "Risky"          # Excellent | Very Good | Good | Risky
    breakdown: IPOScoreBreakdown = Field(default_factory=IPOScoreBreakdown)
    best_time_to_apply: str = "Last Day"   # Day 1 | Day 2 | Last Day Morning | Last Hour
    apply_probability: str = "Low"         # Low | Medium | High
    recommendation: str = "Avoid"          # Apply | Wait | Avoid
    recommendation_reasons: List[str] = []
    avoid_reasons: List[str] = []
    allotment_probability_pct: Optional[float] = None
    estimated_lots: Optional[int] = None
    computed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class IPONotification(BaseModel):
    id: str
    ipo_id: str
    ipo_name: str
    type: str      # ipo_open | ipo_last_day | gmp_change | subscription_5x | allotment | listing
    message: str
    is_read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class IPOListingHistory(BaseModel):
    ipo_id: str
    company_name: str
    issue_price: float
    listing_price: float
    listing_gain_pct: float
    listing_date: str
    closing_price_day1: Optional[float] = None
    max_gain_pct: Optional[float] = None
    max_loss_pct: Optional[float] = None
    sector: Optional[str] = None
    issue_type: str = "Mainboard"


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class IPOListResponse(BaseModel):
    ipos: List[IPOMaster]
    total: int
    timestamp: str


class IPODetailResponse(BaseModel):
    ipo: IPOMaster
    subscription: Optional[IPOSubscription] = None
    rating: Optional[IPORating] = None
    gmp_history: List[IPOGMPEntry] = []
    timestamp: str


class IPOHistoryResponse(BaseModel):
    history: List[IPOListingHistory]
    total: int
    avg_listing_gain: float
    best_gain: float
    worst_gain: float
    timestamp: str
