"""
tests/test_market_session.py
─────────────────────────────
Unit tests for MarketSessionService.

Run with:
    cd backend
    python -m pytest tests/test_market_session.py -v

Covers:
  - is_trading_day() for weekdays, weekends, holidays
  - is_market_open() across all time boundaries
  - get_market_status() status strings and data_source field
  - should_use_live_data() / should_use_offline_data()
  - reload_holidays()
  - _next_open_str() skips weekends and holidays
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytest
import pytz

# Allow running from repo root or backend/ directory
_BACKEND = os.path.join(os.path.dirname(__file__), "..")
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from app.services.market_session import MarketSessionService, IST

# ── Fixtures ──────────────────────────────────────────────────────────────────

SAMPLE_HOLIDAYS = {
    "2025-01-26": "Republic Day",
    "2025-08-15": "Independence Day",
    "2026-08-15": "Independence Day",
}


@pytest.fixture
def holidays_file(tmp_path):
    """Write a temp holidays.json and return its path."""
    p = tmp_path / "holidays.json"
    p.write_text(json.dumps(SAMPLE_HOLIDAYS))
    return str(p)


@pytest.fixture
def service(holidays_file):
    """MarketSessionService instance with temp holidays."""
    return MarketSessionService(holidays_path=holidays_file)


def ist(year, month, day, hour=12, minute=0) -> datetime:
    """Return a timezone-aware IST datetime."""
    return IST.localize(datetime(year, month, day, hour, minute, 0))


# ── is_trading_day() ──────────────────────────────────────────────────────────

class TestIsTradingDay:

    def test_monday_is_trading_day(self, service):
        # 2025-07-28 is a Monday
        assert service.is_trading_day(ist(2025, 7, 28)) is True

    def test_friday_is_trading_day(self, service):
        # 2025-08-01 is a Friday
        assert service.is_trading_day(ist(2025, 8, 1)) is True

    def test_saturday_is_not_trading_day(self, service):
        # 2025-08-02 is a Saturday
        assert service.is_trading_day(ist(2025, 8, 2)) is False

    def test_sunday_is_not_trading_day(self, service):
        # 2025-08-03 is a Sunday
        assert service.is_trading_day(ist(2025, 8, 3)) is False

    def test_holiday_is_not_trading_day(self, service):
        # 2025-01-26 Republic Day
        assert service.is_trading_day(ist(2025, 1, 26)) is False

    def test_non_holiday_weekday_is_trading_day(self, service):
        # 2025-03-03 Monday – not in our sample holidays
        assert service.is_trading_day(ist(2025, 3, 3)) is True


# ── is_market_open() ──────────────────────────────────────────────────────────

class TestIsMarketOpen:

    def test_open_during_session(self, service):
        # Monday 11:00 IST
        assert service.is_market_open(ist(2025, 7, 28, 11, 0)) is True

    def test_open_at_exact_open_time(self, service):
        assert service.is_market_open(ist(2025, 7, 28, 9, 15)) is True

    def test_open_at_exact_close_time(self, service):
        assert service.is_market_open(ist(2025, 7, 28, 15, 30)) is True

    def test_closed_before_open(self, service):
        assert service.is_market_open(ist(2025, 7, 28, 9, 14)) is False

    def test_closed_after_close(self, service):
        assert service.is_market_open(ist(2025, 7, 28, 15, 31)) is False

    def test_closed_on_saturday(self, service):
        assert service.is_market_open(ist(2025, 8, 2, 11, 0)) is False

    def test_closed_on_sunday(self, service):
        assert service.is_market_open(ist(2025, 8, 3, 11, 0)) is False

    def test_closed_on_holiday(self, service):
        # 2025-01-26 Republic Day, would be 11:00 IST
        assert service.is_market_open(ist(2025, 1, 26, 11, 0)) is False


# ── get_market_status() ───────────────────────────────────────────────────────

class TestGetMarketStatus:

    def _status_at(self, service: MarketSessionService, dt: datetime):
        with patch.object(service, "ist_now", return_value=dt):
            return service.get_market_status()

    def test_live_status_during_session(self, service):
        s = self._status_at(service, ist(2025, 7, 28, 10, 0))
        assert s.status      == "LIVE"
        assert s.is_open     is True
        assert s.data_source == "live"

    def test_pre_open_status(self, service):
        s = self._status_at(service, ist(2025, 7, 28, 8, 0))
        assert s.status      == "PRE_OPEN"
        assert s.is_open     is False
        assert s.data_source == "offline"

    def test_closed_after_market(self, service):
        s = self._status_at(service, ist(2025, 7, 28, 16, 0))
        assert s.status      == "CLOSED"
        assert s.is_open     is False
        assert s.data_source == "offline"

    def test_closed_saturday(self, service):
        s = self._status_at(service, ist(2025, 8, 2, 12, 0))
        assert s.status      == "CLOSED"
        assert s.is_open     is False

    def test_closed_sunday(self, service):
        s = self._status_at(service, ist(2025, 8, 3, 12, 0))
        assert s.status      == "CLOSED"
        assert s.is_open     is False

    def test_holiday_status(self, service):
        s = self._status_at(service, ist(2025, 1, 26, 11, 0))
        assert s.status        == "HOLIDAY"
        assert s.holiday_name  == "Republic Day"
        assert s.data_source   == "offline"

    def test_to_dict_has_all_keys(self, service):
        s = self._status_at(service, ist(2025, 7, 28, 10, 0))
        d = s.to_dict()
        for key in ["is_open", "is_trading_day", "status", "data_source",
                    "message", "current_time_ist", "refresh_interval"]:
            assert key in d, f"Missing key: {key}"

    def test_refresh_interval_live(self, service):
        s = self._status_at(service, ist(2025, 7, 28, 10, 0))
        assert s.refresh_interval == 10

    def test_refresh_interval_closed(self, service):
        s = self._status_at(service, ist(2025, 7, 28, 16, 0))
        assert s.refresh_interval == 300


# ── should_use_live/offline ───────────────────────────────────────────────────

class TestDataSourceHelpers:

    def test_should_use_live_during_session(self, service):
        with patch.object(service, "ist_now", return_value=ist(2025, 7, 28, 11, 0)):
            assert service.should_use_live_data()    is True
            assert service.should_use_offline_data() is False

    def test_should_use_offline_when_closed(self, service):
        with patch.object(service, "ist_now", return_value=ist(2025, 7, 28, 16, 0)):
            assert service.should_use_live_data()    is False
            assert service.should_use_offline_data() is True

    def test_should_use_offline_on_weekend(self, service):
        with patch.object(service, "ist_now", return_value=ist(2025, 8, 2, 11, 0)):
            assert service.should_use_live_data()    is False
            assert service.should_use_offline_data() is True


# ── reload_holidays() ─────────────────────────────────────────────────────────

class TestReloadHolidays:

    def test_reload_adds_new_holidays(self, service, tmp_path):
        extended = dict(SAMPLE_HOLIDAYS)
        extended["2025-09-15"] = "Test Holiday"
        new_file = tmp_path / "new_holidays.json"
        new_file.write_text(json.dumps(extended))
        count = service.reload_holidays(str(new_file))
        assert count == len(extended)
        assert service.is_trading_day(ist(2025, 9, 15)) is False

    def test_reload_with_missing_file_retains_empty(self, service):
        count = service.reload_holidays("/nonexistent/path.json")
        assert count == 0   # falls back to empty dict


# ── _next_open_str() ──────────────────────────────────────────────────────────

class TestNextOpenStr:

    def test_next_open_skips_weekend(self, service):
        # Friday 16:00 → next open should be Monday 09:15
        dt = ist(2025, 8, 1, 16, 0)   # Friday
        result = service._next_open_str(dt)
        assert result != ""
        next_dt = datetime.fromisoformat(result)
        assert next_dt.weekday() == 0   # Monday
        # Hour should be 9 in IST
        next_ist = next_dt.astimezone(IST)
        assert next_ist.hour   == 9
        assert next_ist.minute == 15

    def test_next_open_skips_holiday(self, service):
        # 2026-08-14 is a Friday; 2026-08-15 is Independence Day (holiday),
        # so next open should be Monday 2026-08-17
        dt = ist(2026, 8, 14, 16, 0)
        result = service._next_open_str(dt)
        assert result != ""
        next_dt = datetime.fromisoformat(result).astimezone(IST)
        assert next_dt.date().isoformat() == "2026-08-17"
