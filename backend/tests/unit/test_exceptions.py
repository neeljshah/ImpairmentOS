"""Unit tests for custom exception hierarchy and TransitionMiddleware."""
import pytest
from unittest.mock import MagicMock, patch
from transitions import MachineError

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.exceptions import (
    ImpairmentOSError,
    ComplianceViolationError,
    InvalidTransitionError,
    AHJNotificationRequired,
    MainDrainTestRequired,
    FireWatchIncomplete,
    ImpairmentClosedError,
)
from app.state.middleware import TransitionMiddleware


class TestExceptionHierarchy:
    def test_all_exceptions_inherit_base(self):
        for exc_class in [
            ComplianceViolationError,
            InvalidTransitionError,
            ImpairmentClosedError,
        ]:
            assert issubclass(exc_class, ImpairmentOSError)

    def test_specific_compliance_errors_inherit_compliance_violation(self):
        assert issubclass(AHJNotificationRequired, ComplianceViolationError)
        assert issubclass(MainDrainTestRequired, ComplianceViolationError)
        assert issubclass(FireWatchIncomplete, ComplianceViolationError)

    def test_compliance_violation_stores_violations(self):
        violations = [{"type": "ahj", "message": "AHJ missing", "severity": "error", "blocks_closure": True}]
        exc = ComplianceViolationError(violations)
        assert exc.violations == violations
        assert "AHJ missing" in str(exc)

    def test_invalid_transition_stores_state_and_trigger(self):
        exc = InvalidTransitionError("open", "close_impairment")
        assert exc.current_state == "open"
        assert exc.attempted_trigger == "close_impairment"
        assert "open" in str(exc)
        assert "close_impairment" in str(exc)

    def test_impairment_closed_error_includes_id(self):
        exc = ImpairmentClosedError(42)
        assert "42" in str(exc)


class TestTransitionMiddleware:
    def test_successful_transition_returns_new_state(self):
        sm = MagicMock()
        sm.state = "fire_watch_active"

        def mock_trigger():
            sm.state = "repair_in_progress"

        sm.begin_repair = mock_trigger
        result = TransitionMiddleware.execute_transition(sm, "begin_repair")
        assert result == "repair_in_progress"

    def test_machine_error_raises_invalid_transition(self):
        sm = MagicMock()
        sm.state = "open"
        sm.close_impairment = MagicMock(side_effect=MachineError("invalid"))
        with pytest.raises(InvalidTransitionError) as exc_info:
            TransitionMiddleware.execute_transition(sm, "close_impairment")
        assert exc_info.value.current_state == "open"
        assert exc_info.value.attempted_trigger == "close_impairment"

    def test_unknown_trigger_raises_invalid_transition(self):
        sm = MagicMock(spec=[])
        sm.state = "open"
        with pytest.raises(InvalidTransitionError):
            TransitionMiddleware.execute_transition(sm, "nonexistent_trigger")

    def test_guard_value_error_raises_compliance_violation(self):
        sm = MagicMock()
        sm.state = "restoration_testing"
        sm.mark_pending_closure = MagicMock(
            side_effect=ValueError("AHJ notification required")
        )
        with pytest.raises(ComplianceViolationError) as exc_info:
            TransitionMiddleware.execute_transition(sm, "mark_pending_closure")
        assert "AHJ notification required" in exc_info.value.violations[0]["message"]

    def test_compliance_violation_has_guard_failure_type(self):
        sm = MagicMock()
        sm.state = "restoration_testing"
        sm.mark_pending_closure = MagicMock(
            side_effect=ValueError("Main drain test required")
        )
        with pytest.raises(ComplianceViolationError) as exc_info:
            TransitionMiddleware.execute_transition(sm, "mark_pending_closure")
        assert exc_info.value.violations[0]["type"] == "guard_failure"
        assert exc_info.value.violations[0]["blocks_closure"] is True
