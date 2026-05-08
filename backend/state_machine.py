"""
ImpairmentOS State Machine

States:
  open → fire_watch_active → repair_in_progress → restoration_testing
       → pending_closure → closed | closed_incomplete

Guard conditions enforce jurisdiction-specific compliance rules before
any transition to 'closed' or 'pending_closure'.
"""

from transitions import Machine
from datetime import datetime, timezone
from typing import Optional

from app.core.timestamp_service import TimestampService


STATES = [
    "open",
    "fire_watch_active",
    "repair_in_progress",
    "restoration_testing",
    "pending_closure",
    "closed",
    "closed_incomplete",
]


class ImpairmentStateMachine:
    """
    Wraps an impairment record and its jurisdiction rules, exposing
    named trigger methods that raise ValueError with a human-readable
    message when a guard condition fails.
    """

    def __init__(self, impairment, jurisdiction):
        self.impairment = impairment
        self.jurisdiction = jurisdiction

        self.machine = Machine(
            model=self,
            states=STATES,
            initial=impairment.status,
            auto_transitions=False,
        )

        # Transitions — guard conditions run as `conditions`
        self.machine.add_transition(
            trigger="start_fire_watch",
            source="open",
            dest="fire_watch_active",
        )
        self.machine.add_transition(
            trigger="begin_repair",
            source=["open", "fire_watch_active"],
            dest="repair_in_progress",
        )
        self.machine.add_transition(
            trigger="begin_restoration_test",
            source="repair_in_progress",
            dest="restoration_testing",
        )
        self.machine.add_transition(
            trigger="mark_pending_closure",
            source="restoration_testing",
            dest="pending_closure",
            conditions=["_can_move_to_pending"],
        )
        self.machine.add_transition(
            trigger="close_impairment",
            source="pending_closure",
            dest="closed",
            conditions=["_can_close"],
        )
        self.machine.add_transition(
            trigger="close_incomplete",
            source=["open", "fire_watch_active", "repair_in_progress",
                    "restoration_testing", "pending_closure"],
            dest="closed_incomplete",
        )
        # Allow re-opening from restoration_testing back to repair_in_progress
        self.machine.add_transition(
            trigger="back_to_repair",
            source="restoration_testing",
            dest="repair_in_progress",
        )

    # ── Guard helpers ────────────────────────────────────────────

    def _duration_hours(self) -> float:
        imp = self.impairment
        end = imp.restored_at or TimestampService.now_utc()
        return TimestampService.duration_hours(imp.opened_at, end)

    def _ahj_notification_satisfied(self) -> tuple[bool, Optional[str]]:
        jur = self.jurisdiction
        imp = self.impairment

        if not jur.ahj_notification_required:
            return True, None

        duration = self._duration_hours()
        threshold = jur.notification_threshold_hours or 0

        if duration > threshold and not imp.ahj_notified:
            code_ref = jur.local_code_ref or "jurisdiction rules"
            if threshold == 0:
                msg = (
                    f"AHJ notification required for all impairments "
                    f"({code_ref}). Notification not recorded."
                )
            else:
                msg = (
                    f"AHJ notification required for impairments exceeding "
                    f"{threshold} hours ({code_ref}). Duration is "
                    f"{duration:.1f}h. Notification not recorded."
                )
            return False, msg

        return True, None

    def _main_drain_satisfied(self) -> tuple[bool, Optional[str]]:
        jur = self.jurisdiction
        imp = self.impairment

        if not jur.main_drain_on_restore:
            return True, None

        duration = self._duration_hours()
        if duration > 4 and not imp.main_drain_test_performed:
            return False, (
                "Main drain test required for impairments exceeding 4 hours "
                "(NFPA 25 §13.2.5). Duration is "
                f"{duration:.1f}h. Test not recorded."
            )
        return True, None

    def _fire_watch_end_satisfied(self) -> tuple[bool, Optional[str]]:
        imp = self.impairment
        if imp.fire_watch_started_at and not imp.fire_watch_ended_at:
            return False, "Fire watch was started but end time was not recorded."
        return True, None

    def _can_move_to_pending(self) -> bool:
        ok1, msg1 = self._ahj_notification_satisfied()
        ok2, msg2 = self._main_drain_satisfied()
        ok3, msg3 = self._fire_watch_end_satisfied()

        if not ok1:
            raise ValueError(msg1)
        if not ok2:
            raise ValueError(msg2)
        if not ok3:
            raise ValueError(msg3)
        return True

    def _can_close(self) -> bool:
        # At closure time, re-check all guards
        ok1, msg1 = self._ahj_notification_satisfied()
        ok2, msg2 = self._main_drain_satisfied()
        ok3, msg3 = self._fire_watch_end_satisfied()

        if not ok1:
            raise ValueError(msg1)
        if not ok2:
            raise ValueError(msg2)
        if not ok3:
            raise ValueError(msg3)
        return True

    def get_compliance_violations(self) -> list[dict]:
        violations = []

        ok1, msg1 = self._ahj_notification_satisfied()
        if not ok1:
            violations.append({
                "type": "ahj_notification",
                "message": msg1,
                "severity": "error",
                "blocks_closure": True,
            })

        ok2, msg2 = self._main_drain_satisfied()
        if not ok2:
            violations.append({
                "type": "main_drain_test",
                "message": msg2,
                "severity": "error",
                "blocks_closure": True,
            })

        ok3, msg3 = self._fire_watch_end_satisfied()
        if not ok3:
            violations.append({
                "type": "fire_watch_end",
                "message": msg3,
                "severity": "warning",
                "blocks_closure": True,
            })

        return violations
