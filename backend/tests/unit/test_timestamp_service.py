"""Unit tests for TimestampService — timezone handling, duration calculation."""
import pytest
from datetime import datetime, timezone, timedelta

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.timestamp_service import TimestampService


class TestNowUtc:
    def test_returns_timezone_aware(self):
        now = TimestampService.now_utc()
        assert now.tzinfo is not None

    def test_returns_utc(self):
        now = TimestampService.now_utc()
        assert now.tzinfo == timezone.utc or str(now.tzinfo) == "UTC"

    def test_is_recent(self):
        before = datetime.now(timezone.utc) - timedelta(seconds=1)
        now = TimestampService.now_utc()
        after = datetime.now(timezone.utc) + timedelta(seconds=1)
        assert before <= now <= after


class TestDurationHours:
    def test_simple_duration_naive(self):
        start = datetime(2026, 1, 12, 7, 40)
        end = datetime(2026, 1, 12, 13, 30)
        hours = TimestampService.duration_hours(start, end)
        assert abs(hours - 5.833) < 0.01

    def test_simple_duration_aware(self):
        start = datetime(2026, 1, 12, 7, 40, tzinfo=timezone.utc)
        end = datetime(2026, 1, 12, 13, 30, tzinfo=timezone.utc)
        hours = TimestampService.duration_hours(start, end)
        assert abs(hours - 5.833) < 0.01

    def test_mixed_aware_naive_treated_same(self):
        start_naive = datetime(2026, 1, 12, 7, 40)
        end_aware = datetime(2026, 1, 12, 13, 30, tzinfo=timezone.utc)
        hours = TimestampService.duration_hours(start_naive, end_aware)
        assert abs(hours - 5.833) < 0.01

    def test_does_not_strip_tzinfo(self):
        start = datetime(2026, 1, 12, 7, 40, tzinfo=timezone.utc)
        end = datetime(2026, 1, 12, 9, 40, tzinfo=timezone.utc)
        hours = TimestampService.duration_hours(start, end)
        assert abs(hours - 2.0) < 0.001
        # start should still have tzinfo (not mutated)
        assert start.tzinfo is not None

    def test_end_none_uses_now(self):
        start = datetime.now(timezone.utc) - timedelta(hours=3)
        hours = TimestampService.duration_hours(start, None)
        assert 2.9 < hours < 3.1

    def test_cedar_heights_duration(self):
        # 07:40 to 13:30 = 5h 50m = 5.833h
        start = datetime(2026, 1, 12, 7, 40)
        end = datetime(2026, 1, 12, 13, 30)
        hours = TimestampService.duration_hours(start, end)
        assert hours > 4  # Triggers main drain + AHJ requirements


class TestToDisplay:
    def test_converts_utc_to_eastern(self):
        utc = datetime(2026, 1, 12, 12, 0, tzinfo=timezone.utc)
        eastern = TimestampService.to_display(utc, "America/New_York")
        # In January, Eastern is UTC-5
        assert eastern.hour == 7

    def test_naive_input_treated_as_utc(self):
        naive = datetime(2026, 1, 12, 12, 0)
        result = TimestampService.to_display(naive, "America/New_York")
        assert result.tzinfo is not None
        assert result.hour == 7

    def test_result_is_timezone_aware(self):
        utc = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
        result = TimestampService.to_display(utc, "America/New_York")
        assert result.tzinfo is not None


class TestFormatForPacket:
    def test_format_structure(self):
        utc = datetime(2026, 1, 12, 12, 40, tzinfo=timezone.utc)
        formatted = TimestampService.format_for_packet(utc, "America/New_York")
        # 12:40 UTC = 07:40 EST in January
        assert "07:40" in formatted
        assert "AM" in formatted

    def test_format_does_not_raise_for_valid_tz(self):
        utc = datetime(2026, 5, 8, 14, 0, tzinfo=timezone.utc)
        result = TimestampService.format_for_packet(utc, "America/Chicago")
        assert isinstance(result, str)
        assert len(result) > 0
