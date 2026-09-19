import pytest
from app.services.state_machine import PaymentStateMachine, PaymentStatus, StateTransitionError

def test_legal_state_transitions():
    assert PaymentStateMachine.can_transition("CREATED", "VALIDATED")
    assert PaymentStateMachine.can_transition("VALIDATED", "AUTH_REQUIRED")
    assert PaymentStateMachine.can_transition("AUTH_REQUIRED", "AUTHENTICATED")
    assert PaymentStateMachine.can_transition("AUTHENTICATED", "CONFIRMATION_REQUIRED")
    assert PaymentStateMachine.can_transition("CONFIRMATION_REQUIRED", "CONFIRMED")
    assert PaymentStateMachine.can_transition("CONFIRMED", "PROCESSING")
    assert PaymentStateMachine.can_transition("PROCESSING", "SUCCESS")
    assert PaymentStateMachine.can_transition("PROCESSING", "FAILED")
    assert PaymentStateMachine.can_transition("PROCESSING", "PENDING")

def test_illegal_state_transitions_rejected():
    # SUCCESS -> PROCESSING (Rejected)
    assert not PaymentStateMachine.can_transition("SUCCESS", "PROCESSING")
    with pytest.raises(StateTransitionError):
        PaymentStateMachine.transition("SUCCESS", "PROCESSING")

    # CANCELLED -> PROCESSING (Rejected)
    assert not PaymentStateMachine.can_transition("CANCELLED", "PROCESSING")
    with pytest.raises(StateTransitionError):
        PaymentStateMachine.transition("CANCELLED", "PROCESSING")

    # EXPIRED -> PROCESSING (Rejected)
    assert not PaymentStateMachine.can_transition("EXPIRED", "PROCESSING")
    with pytest.raises(StateTransitionError):
        PaymentStateMachine.transition("EXPIRED", "PROCESSING")

    # AUTH_REQUIRED -> SUCCESS (Bypassing confirmation & provider execution)
    assert not PaymentStateMachine.can_transition("AUTH_REQUIRED", "SUCCESS")
    with pytest.raises(StateTransitionError):
        PaymentStateMachine.transition("AUTH_REQUIRED", "SUCCESS")

    # CONFIRMATION_REQUIRED -> SUCCESS (Bypassing provider execution)
    assert not PaymentStateMachine.can_transition("CONFIRMATION_REQUIRED", "SUCCESS")
    with pytest.raises(StateTransitionError):
        PaymentStateMachine.transition("CONFIRMATION_REQUIRED", "SUCCESS")
