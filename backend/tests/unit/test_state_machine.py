"""Unit tests for ImpairmentStateMachine transitions and guard conditions."""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock
from transitions import MachineError

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from state_machine import ImpairmentStateMachine
from app.core.exceptions import InvalidTransitionError, ComplianceViolationError
from app.state.middleware import TransitionMiddleware


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_jurisdiction(
    ahj_required=True,
    threshold_hours=0,
    fire_watch_required=True,
    main_drain_on_restore=True,
    local_code_ref="TEST-CODE",
):
    j = MagicMock()
    j.ahj_notification_required = ahj_required
    j.notification_threshold_hours = threshold_hours
    j.fire_watch_required = fire_watch_required
    j.main_drain_on_restore = main_drain_on_restore
    j.local_code_ref = local_code_ref
    return j


def make_impairment(
    status="open",
    opened_at=None,
    restored_at=None,
    ahj_notified=False,
    fire_watch_started_at=None,
    fire_watch_ended_at=None,
    main_drain_test_performed=False,
):
    imp = MagicMock()
    imp.status = status
    imp.opened_at = opened_at or datetime(2026, 1, 12, 7, 40)
    imp.restored_at = restored_at
    imp.ahj_notified = ahj_notified
    imp.fire_watch_started_at = fire_watch_started_at
    imp.fire_watch_ended_at = fire_watch_ended_at
    imp.main_drain_test_performed = main_drain_test_performed
    return imp


# ── Valid transition tests ─────────────────────────────────────────────────────

class TestValidTransitions:
    def test_open_to_fire_watch_active(self):
        imp = make_impairment(status="open")
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        sm.start_fire_watch()
        assert sm.state == "fire_watch_active"

    def test_open_to_repair_in_progress(self):
        imp = make_impairment(status="open")
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        sm.begin_repair()
        assert sm.state == "repair_in_progress"

    def test_fire_watch_active_to_repair_in_progress(self):
        imp = make_impairment(status="fire_watch_active")
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        sm.begin_repair()
        assert sm.state == "repair_in_progress"

    def test_repair_in_progress_to_restoration_testing(self):
        imp = make_impairment(status="repair_in_progress")
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        sm.begin_restoration_test()
        assert sm.state == "restoration_testing"

    def test_restoration_testing_to_pending_closure_all_satisfied(self):
        imp = make_impairment(
            status="restoration_testing",
            opened_at=datetime(2026, 1, 12, 7, 40),
            restored_at=datetime(2026, 1, 12, 9, 0),  # ~1.3h — under 4h
            ahj_notified=True,
        )
        jur = make_jurisdiction(main_drain_on_restore=True)
        sm = ImpairmentStateMachine(imp, jur)
        sm.mark_pending_closure()
        assert sm.state == "pending_closure"

    def test_pending_closure_to_closed(self):
        imp = make_impairment(
            status="pending_closure",
            opened_at=datetime(2026, 1, 12, 7, 40),
            restored_at=datetime(2026, 1, 12, 9, 0),
            ahj_notified=True,
        )
        jur = make_jurisdiction(main_drain_on_restore=True)
        sm = ImpairmentStateMachine(imp, jur)
        sm.close_impairment()
        assert sm.state == "closed"

    def test_close_incomplete_from_any_active_state(self):
        for status in ["open", "fire_watch_active", "repair_in_progress",
                       "restoration_testing", "pending_closure"]:
            imp = make_impairment(status=status)
            jur = make_jurisdiction()
            sm = ImpairmentStateMachine(imp, jur)
            sm.close_incomplete()
            assert sm.state == "closed_incomplete"

    def test_back_to_repair_from_restoration_testing(self):
        imp = make_impairment(status="restoration_testing")
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        sm.back_to_repair()
        assert sm.state == "repair_in_progress"


# ── Invalid transition tests ──────────────────────────────────────────────────

class TestInvalidTransitions:
    def test_cannot_start_fire_watch_from_repair(self):
        imp = make_impairment(status="repair_in_progress")
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        with pytest.raises(MachineError):
            sm.start_fire_watch()

    def test_cannot_begin_restoration_from_open(self):
        imp = make_impairment(status="open")
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        with pytest.raises(MachineError):
            sm.begin_restoration_test()

    def test_cannot_close_from_repair_in_progress(self):
        imp = make_impairment(status="repair_in_progress")
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        with pytest.raises(MachineError):
            sm.close_impairment()


# ── Guard condition tests ─────────────────────────────────────────────────────

class TestGuardConditions:
    def test_ahj_required_blocks_pending_closure_when_missing(self):
        imp = make_impairment(
            status="restoration_testing",
            opened_at=datetime(2026, 1, 12, 7, 0),
            restored_at=datetime(2026, 1, 12, 8, 0),
            ahj_notified=False,
        )
        jur = make_jurisdiction(ahj_required=True, threshold_hours=0)
        sm = ImpairmentStateMachine(imp, jur)
        with pytest.raises(ValueError, match="AHJ notification"):
            sm.mark_pending_closure()

    def test_ahj_not_required_allows_pending_closure(self):
        imp = make_impairment(
            status="restoration_testing",
            opened_at=datetime(2026, 1, 12, 7, 0),
            restored_at=datetime(2026, 1, 12, 8, 0),
            ahj_notified=False,
        )
        jur = make_jurisdiction(ahj_required=False)
        sm = ImpairmentStateMachine(imp, jur)
        sm.mark_pending_closure()
        assert sm.state == "pending_closure"

    def test_ahj_threshold_4h_not_triggered_under_4h(self):
        imp = make_impairment(
            status="restoration_testing",
            opened_at=datetime(2026, 1, 12, 7, 0),
            restored_at=datetime(2026, 1, 12, 9, 0),  # 2 hours
            ahj_notified=False,
        )
        jur = make_jurisdiction(ahj_required=True, threshold_hours=4)
        sm = ImpairmentStateMachine(imp, jur)
        sm.mark_pending_closure()
        assert sm.state == "pending_closure"

    def test_main_drain_required_over_4h_blocks_closure(self):
        imp = make_impairment(
            status="restoration_testing",
            opened_at=datetime(2026, 1, 12, 7, 0),
            restored_at=datetime(2026, 1, 12, 12, 0),  # 5 hours
            ahj_notified=True,
            main_drain_test_performed=False,
        )
        jur = make_jurisdiction(main_drain_on_restore=True)
        sm = ImpairmentStateMachine(imp, jur)
        with pytest.raises(ValueError, match="[Mm]ain drain"):
            sm.mark_pending_closure()

    def test_main_drain_not_required_under_4h(self):
        imp = make_impairment(
            status="restoration_testing",
            opened_at=datetime(2026, 1, 12, 7, 0),
            restored_at=datetime(2026, 1, 12, 9, 0),  # 2 hours
            ahj_notified=True,
            main_drain_test_performed=False,
        )
        jur = make_jurisdiction(main_drain_on_restore=True)
        sm = ImpairmentStateMachine(imp, jur)
        sm.mark_pending_closure()
        assert sm.state == "pending_closure"

    def test_fire_watch_incomplete_blocks_pending_closure(self):
        fw_started = datetime(2026, 1, 12, 8, 0)
        imp = make_impairment(
            status="restoration_testing",
            opened_at=datetime(2026, 1, 12, 7, 0),
            restored_at=datetime(2026, 1, 12, 9, 0),
            ahj_notified=True,
            fire_watch_started_at=fw_started,
            fire_watch_ended_at=None,  # not ended
        )
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        with pytest.raises(ValueError, match="[Ff]ire watch"):
            sm.mark_pending_closure()

    def test_fire_watch_complete_allows_pending_closure(self):
        fw_started = datetime(2026, 1, 12, 8, 0)
        fw_ended = datetime(2026, 1, 12, 9, 0)
        imp = make_impairment(
            status="restoration_testing",
            opened_at=datetime(2026, 1, 12, 7, 0),
            restored_at=datetime(2026, 1, 12, 9, 0),
            ahj_notified=True,
            fire_watch_started_at=fw_started,
            fire_watch_ended_at=fw_ended,
        )
        jur = make_jurisdiction()
        sm = ImpairmentStateMachine(imp, jur)
        sm.mark_pending_closure()
        assert sm.state == "pending_closure"


# ── Cedar Heights regression ──────────────────────────────────────────────────

class TestCedarHeightsScenario:
    """
    Cedar Heights: AHJ never notified, duration 5.8h, main drain not recorded.
    Both violations must block closure.
    """

    def setup_method(self):
        self.opened_at = datetime(2026, 1, 12, 7, 40)
        self.restored_at = datetime(2026, 1, 12, 13, 30)
        self.imp = make_impairment(
            status="restoration_testing",
            opened_at=self.opened_at,
            restored_at=self.restored_at,
            ahj_notified=False,
            fire_watch_started_at=datetime(2026, 1, 12, 8, 0),
            fire_watch_ended_at=datetime(2026, 1, 12, 13, 30),
            main_drain_test_performed=False,
        )
        self.jur = make_jurisdiction(ahj_required=True, threshold_hours=0, main_drain_on_restore=True)
        self.sm = ImpairmentStateMachine(self.imp, self.jur)

    def test_has_ahj_violation(self):
        violations = self.sm.get_compliance_violations()
        types = [v["type"] for v in violations]
        assert "ahj_notification" in types

    def test_has_main_drain_violation(self):
        violations = self.sm.get_compliance_violations()
        types = [v["type"] for v in violations]
        assert "main_drain_test" in types

    def test_both_violations_block_closure(self):
        violations = self.sm.get_compliance_violations()
        blocking = [v for v in violations if v["blocks_closure"]]
        assert len(blocking) >= 2

    def test_cannot_advance_to_pending_closure(self):
        with pytest.raises(ValueError):
            self.sm.mark_pending_closure()
