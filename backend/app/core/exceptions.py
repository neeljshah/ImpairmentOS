class ImpairmentOSError(Exception):
    """Base exception for all ImpairmentOS errors."""


class ComplianceViolationError(ImpairmentOSError):
    """Raised when a state transition would violate a compliance rule."""

    def __init__(self, violations: list[dict]):
        self.violations = violations
        messages = [v["message"] for v in violations]
        super().__init__(f"Compliance violations: {'; '.join(messages)}")


class InvalidTransitionError(ImpairmentOSError):
    """Raised when a state transition is not allowed by the state graph."""

    def __init__(self, current_state: str, attempted_trigger: str):
        self.current_state = current_state
        self.attempted_trigger = attempted_trigger
        super().__init__(
            f"Cannot execute '{attempted_trigger}' from state '{current_state}'"
        )


class AHJNotificationRequired(ComplianceViolationError):
    """AHJ notification is missing and required by jurisdiction rules."""


class MainDrainTestRequired(ComplianceViolationError):
    """Main drain test is missing for impairment exceeding 4 hours."""


class FireWatchIncomplete(ComplianceViolationError):
    """Fire watch was started but not ended."""


class ImpairmentClosedError(ImpairmentOSError):
    """Raised when attempting to modify a closed impairment."""

    def __init__(self, impairment_id: int):
        super().__init__(f"Impairment {impairment_id} is already closed")
