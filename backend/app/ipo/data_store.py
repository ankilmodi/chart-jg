"""
IPO Apply Assistant – JSON File-based Data Store
Follows the same pattern as the existing watchlist_store.json
"""
from __future__ import annotations
import json
import os
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.ipo.schemas import (
    IPOMaster, IPOSubscription, IPOGMPEntry,
    IPORating, IPONotification, IPOListingHistory
)

logger = logging.getLogger(__name__)

_BASE = os.path.join(os.path.dirname(__file__), "store")
os.makedirs(_BASE, exist_ok=True)

_FILES = {
    "master":       os.path.join(_BASE, "ipo_master.json"),
    "subscription": os.path.join(_BASE, "ipo_subscription.json"),
    "gmp":          os.path.join(_BASE, "ipo_gmp.json"),
    "rating":       os.path.join(_BASE, "ipo_rating.json"),
    "notifications":os.path.join(_BASE, "ipo_notifications.json"),
    "history":      os.path.join(_BASE, "ipo_listing_history.json"),
}


def _load(key: str) -> list:
    try:
        path = _FILES[key]
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning("IPO store load error [%s]: %s", key, e)
    return []


def _save(key: str, data: list) -> None:
    try:
        with open(_FILES[key], "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        logger.error("IPO store save error [%s]: %s", key, e)


# ---------------------------------------------------------------------------
# IPO Master CRUD
# ---------------------------------------------------------------------------

def get_all_ipos() -> List[IPOMaster]:
    raw = _load("master")
    result = []
    for item in raw:
        try:
            result.append(IPOMaster(**item))
        except Exception:
            pass
    return result


def get_ipo_by_id(ipo_id: str) -> Optional[IPOMaster]:
    for item in _load("master"):
        if item.get("id") == ipo_id:
            try:
                return IPOMaster(**item)
            except Exception:
                return None
    return None


def save_ipo(ipo: IPOMaster) -> None:
    data = _load("master")
    existing = [i for i in data if i.get("id") != ipo.id]
    existing.append(ipo.dict())
    _save("master", existing)


def save_ipos_bulk(ipos: List[IPOMaster]) -> None:
    existing = {i.get("id"): i for i in _load("master")}
    for ipo in ipos:
        existing[ipo.id] = ipo.dict()
    _save("master", list(existing.values()))


def delete_ipo(ipo_id: str) -> None:
    data = [i for i in _load("master") if i.get("id") != ipo_id]
    _save("master", data)


# ---------------------------------------------------------------------------
# Subscription
# ---------------------------------------------------------------------------

def get_subscription(ipo_id: str) -> Optional[IPOSubscription]:
    for item in _load("subscription"):
        if item.get("ipo_id") == ipo_id:
            try:
                return IPOSubscription(**item)
            except Exception:
                return None
    return None


def save_subscription(sub: IPOSubscription) -> None:
    data = [i for i in _load("subscription") if i.get("ipo_id") != sub.ipo_id]
    data.append(sub.dict())
    _save("subscription", data)


# ---------------------------------------------------------------------------
# GMP History
# ---------------------------------------------------------------------------

def get_gmp_history(ipo_id: str) -> List[IPOGMPEntry]:
    result = []
    for item in _load("gmp"):
        if item.get("ipo_id") == ipo_id:
            try:
                result.append(IPOGMPEntry(**item))
            except Exception:
                pass
    return sorted(result, key=lambda x: x.timestamp)


def append_gmp(entry: IPOGMPEntry) -> None:
    data = _load("gmp")
    data.append(entry.dict())
    _save("gmp", data[-5000:])   # keep last 5000 GMP entries


# ---------------------------------------------------------------------------
# Ratings
# ---------------------------------------------------------------------------

def get_rating(ipo_id: str) -> Optional[IPORating]:
    for item in _load("rating"):
        if item.get("ipo_id") == ipo_id:
            try:
                return IPORating(**item)
            except Exception:
                return None
    return None


def save_rating(rating: IPORating) -> None:
    data = [i for i in _load("rating") if i.get("ipo_id") != rating.ipo_id]
    data.append(rating.dict())
    _save("rating", data)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def get_notifications(unread_only: bool = False) -> List[IPONotification]:
    result = []
    for item in _load("notifications"):
        try:
            n = IPONotification(**item)
            if unread_only and n.is_read:
                continue
            result.append(n)
        except Exception:
            pass
    return sorted(result, key=lambda x: x.created_at, reverse=True)


def add_notification(n: IPONotification) -> None:
    data = _load("notifications")
    data.append(n.dict())
    _save("notifications", data[-500:])


def mark_notification_read(notif_id: str) -> None:
    data = _load("notifications")
    for item in data:
        if item.get("id") == notif_id:
            item["is_read"] = True
    _save("notifications", data)


def mark_all_notifications_read() -> None:
    data = _load("notifications")
    for item in data:
        item["is_read"] = True
    _save("notifications", data)


# ---------------------------------------------------------------------------
# Listing History
# ---------------------------------------------------------------------------

def get_listing_history() -> List[IPOListingHistory]:
    result = []
    for item in _load("history"):
        try:
            result.append(IPOListingHistory(**item))
        except Exception:
            pass
    return sorted(result, key=lambda x: x.listing_date, reverse=True)


def save_listing_history(h: IPOListingHistory) -> None:
    data = [i for i in _load("history") if i.get("ipo_id") != h.ipo_id]
    data.append(h.dict())
    _save("history", data)
