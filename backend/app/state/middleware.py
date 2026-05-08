from transitions import MachineError

from app.core.exceptions import InvalidTransitionError, ComplianceViolationError


class TransitionMiddleware:
    """
    Wraps state machine trigger calls to convert library exceptions into
    domain exceptions with actionable messages. Never swallows failures.
    """

    @staticmethod
    def execute_transition(state_machine, trigger_name: str, **kwargs) -> str:
        """
        Execute a named trigger on the state machine.
        Returns the new state on success.
        Raises InvalidTransitionError or ComplianceViolationError on failure.
        """
        current = state_machine.state
        trigger = getattr(state_machine, trigger_name, None)
        if trigger is None:
            raise InvalidTransitionError(current, trigger_name)

        try:
            trigger(**kwargs)
        except MachineError:
            raise InvalidTransitionError(current, trigger_name)
        except ValueError as exc:
            # Guard conditions raise ValueError with compliance messages
            raise ComplianceViolationError([
                {
                    "type": "guard_failure",
                    "message": str(exc),
                    "severity": "error",
                    "blocks_closure": True,
                }
            ])

        return state_machine.state
