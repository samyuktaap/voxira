from enum import Enum
from typing import Set, Dict, Optional
from datetime import datetime, timezone

class PaymentStatus(str, Enum):
    CREATED = "CREATED"
    VALIDATED = "VALIDATED"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    AUTHENTICATED = "AUTHENTICATED"
    CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"
    CONFIRMED = "CONFIRMED"
    PROCESSING = "PROCESSING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    PENDING = "PENDING"
    UNKNOWN = "UNKNOWN"

class StateTransitionError(Exception):
    def __init__(self, current_state: str, target_state: str, reason: str = ""):
        self.current_state = current_state
        self.target_state = target_state
        self.reason = reason
        message = f"Illegal payment state transition from '{current_state}' to '{target_state}'."
        if reason:
            message += f" Reason: {reason}"
        super().__init__(message)

class PaymentStateMachine:
    """Strict state machine enforcing legal state transitions for payment lifecycle."""

    ALLOWED_TRANSITIONS: Dict[PaymentStatus, Set[PaymentStatus]] = {
        PaymentStatus.CREATED: {
            PaymentStatus.VALIDATED,
            PaymentStatus.BLOCKED,
            PaymentStatus.EXPIRED,
            PaymentStatus.CANCELLED
        },
        PaymentStatus.VALIDATED: {
            PaymentStatus.AUTH_REQUIRED,
            PaymentStatus.BLOCKED,
            PaymentStatus.EXPIRED,
            PaymentStatus.CANCELLED
        },
        PaymentStatus.AUTH_REQUIRED: {
            PaymentStatus.AUTHENTICATED,
            PaymentStatus.BLOCKED,
            PaymentStatus.EXPIRED,
            PaymentStatus.CANCELLED
        },
        PaymentStatus.AUTHENTICATED: {
            PaymentStatus.CONFIRMATION_REQUIRED,
            PaymentStatus.BLOCKED,
            PaymentStatus.EXPIRED,
            PaymentStatus.CANCELLED
        },
        PaymentStatus.CONFIRMATION_REQUIRED: {
            PaymentStatus.CONFIRMED,
            PaymentStatus.CANCELLED,
            PaymentStatus.EXPIRED,
            PaymentStatus.BLOCKED
        },
        PaymentStatus.CONFIRMED: {
            PaymentStatus.PROCESSING,
            PaymentStatus.FAILED,
            PaymentStatus.BLOCKED,
            PaymentStatus.EXPIRED
        },
        PaymentStatus.PROCESSING: {
            PaymentStatus.SUCCESS,
            PaymentStatus.FAILED,
            PaymentStatus.PENDING,
            PaymentStatus.UNKNOWN,
            PaymentStatus.BLOCKED
        },
        PaymentStatus.PENDING: {
            PaymentStatus.SUCCESS,
            PaymentStatus.FAILED,
            PaymentStatus.UNKNOWN,
            PaymentStatus.CANCELLED
        },
        # Terminal states allow idempotent transition to themselves
        PaymentStatus.SUCCESS: {PaymentStatus.SUCCESS},
        PaymentStatus.FAILED: {PaymentStatus.FAILED},
        PaymentStatus.BLOCKED: {PaymentStatus.BLOCKED},
        PaymentStatus.CANCELLED: {PaymentStatus.CANCELLED},
        PaymentStatus.EXPIRED: {PaymentStatus.EXPIRED},
        PaymentStatus.UNKNOWN: {PaymentStatus.UNKNOWN, PaymentStatus.SUCCESS, PaymentStatus.FAILED}
    }

    @classmethod
    def can_transition(cls, current_state: str, target_state: str) -> bool:
        try:
            current_enum = PaymentStatus(current_state)
            target_enum = PaymentStatus(target_state)
        except ValueError:
            return False

        allowed = cls.ALLOWED_TRANSITIONS.get(current_enum, set())
        return target_enum in allowed

    @classmethod
    def transition(cls, current_state: str, target_state: str) -> str:
        if current_state == target_state:
            # Idempotent no-op for same state
            return target_state

        if not cls.can_transition(current_state, target_state):
            raise StateTransitionError(
                current_state=current_state,
                target_state=target_state,
                reason=f"Transition from {current_state} to {target_state} is prohibited."
            )
        return target_state

    @classmethod
    def get_next_action(cls, status: str) -> str:
        """Map payment state to machine-readable next action for Frontend & Voice UI."""
        mapping = {
            PaymentStatus.CREATED.value: "VALIDATE",
            PaymentStatus.VALIDATED.value: "AUTHENTICATE",
            PaymentStatus.AUTH_REQUIRED.value: "AUTHENTICATE",
            PaymentStatus.AUTHENTICATED.value: "CONFIRM",
            PaymentStatus.CONFIRMATION_REQUIRED.value: "CONFIRM",
            PaymentStatus.CONFIRMED.value: "SUBMIT",
            PaymentStatus.PROCESSING.value: "WAIT_PROVIDER",
            PaymentStatus.PENDING.value: "WAIT_PROVIDER",
            PaymentStatus.SUCCESS.value: "NONE",
            PaymentStatus.FAILED.value: "NONE",
            PaymentStatus.BLOCKED.value: "NONE",
            PaymentStatus.CANCELLED.value: "NONE",
            PaymentStatus.EXPIRED.value: "RECREATE",
            PaymentStatus.UNKNOWN.value: "CHECK_STATUS",
        }
        return mapping.get(status, "NONE")
