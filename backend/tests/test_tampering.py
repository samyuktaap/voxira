import pytest
import uuid
from decimal import Decimal
from app.models.payment import Payment
from app.security.validation import SecurityValidationService, SecurityValidationError

def test_amount_tampering_detected(db_session, auth_headers_user1):
    payment = Payment(
        id=str(uuid.uuid4()),
        transaction_id=str(uuid.uuid4()),
        user_id="user_alice_123",
        amount=Decimal("500.00"),
        currency="INR",
        recipient_id="rec_ravi",
        recipient_name="Ravi Kumar",
        status="AUTH_REQUIRED",
        provider="sandbox",
        idempotency_key=f"key_{uuid.uuid4()}",
        nonce=str(uuid.uuid4()),
        expires_at=SecurityValidationService.ALLOWED_CURRENCIES
    )

    # Attacker attempts to supply 5000.00 instead of authoritative 500.00
    with pytest.raises(SecurityValidationError) as exc_info:
        SecurityValidationService.validate_amount_integrity(payment, supplied_amount=Decimal("5000.00"))
    
    assert exc_info.value.error_code == "AMOUNT_TAMPERING_DETECTED"

def test_recipient_tampering_detected(db_session, auth_headers_user1):
    payment = Payment(
        id=str(uuid.uuid4()),
        transaction_id=str(uuid.uuid4()),
        user_id="user_alice_123",
        amount=Decimal("500.00"),
        currency="INR",
        recipient_id="rec_ravi",
        recipient_name="Ravi Kumar",
        status="AUTH_REQUIRED",
        provider="sandbox",
        idempotency_key=f"key_{uuid.uuid4()}",
        nonce=str(uuid.uuid4()),
        expires_at=SecurityValidationService.ALLOWED_CURRENCIES
    )

    # Attacker attempts to modify recipient from rec_ravi to rec_attacker
    with pytest.raises(SecurityValidationError) as exc_info:
        SecurityValidationService.validate_recipient_integrity(payment, supplied_recipient_id="rec_attacker")

    assert exc_info.value.error_code == "RECIPIENT_TAMPERING_DETECTED"
