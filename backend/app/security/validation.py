from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.payment import Payment
from app.services.state_machine import PaymentStateMachine, PaymentStatus, StateTransitionError

class SecurityValidationError(Exception):
    def __init__(self, error_code: str, message: str, transaction_id: Optional[str] = None):
        self.error_code = error_code
        self.message = message
        self.transaction_id = transaction_id
        super().__init__(message)

class SecurityValidationService:
    ALLOWED_CURRENCIES = {"INR", "USD", "EUR", "GBP"}

    @classmethod
    def validate_new_intent(
        cls,
        amount: Decimal,
        currency: str,
        recipient_id: str,
        recipient_name: str
    ):
        if amount is None or amount <= Decimal("0.00"):
            raise SecurityValidationError("INVALID_AMOUNT", "Payment amount must be greater than zero.")
        
        if not currency or currency.upper() not in cls.ALLOWED_CURRENCIES:
            raise SecurityValidationError("INVALID_CURRENCY", f"Currency '{currency}' is not supported.")
        
        if not recipient_id or not recipient_id.strip():
            raise SecurityValidationError("INVALID_RECIPIENT", "Recipient ID cannot be empty.")

        if not recipient_name or not recipient_name.strip():
            raise SecurityValidationError("INVALID_RECIPIENT", "Recipient name cannot be empty.")

    @classmethod
    def check_expiration(cls, db: Session, payment: Payment) -> bool:
        """
        Timezone-aware expiration check.
        If current UTC time exceeds expires_at, transitions state to EXPIRED.
        """
        now = datetime.now(timezone.utc)
        expires_at = payment.expires_at
        
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now >= expires_at:
            if payment.status not in (PaymentStatus.SUCCESS.value, PaymentStatus.FAILED.value, PaymentStatus.CANCELLED.value, PaymentStatus.EXPIRED.value):
                try:
                    payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.EXPIRED.value)
                    db.commit()
                except Exception:
                    db.rollback()
            raise SecurityValidationError(
                error_code="PAYMENT_EXPIRED",
                message="This payment request has expired.",
                transaction_id=payment.transaction_id
            )
        return False

    @classmethod
    def validate_amount_integrity(
        cls,
        payment: Payment,
        supplied_amount: Optional[Decimal] = None
    ):
        """
        Guarantees amount immutability.
        If caller/attacker attempts to supply a modified amount during execution, rejects transaction.
        """
        if supplied_amount is not None:
            db_amount = Decimal(str(payment.amount))
            supp_amount = Decimal(str(supplied_amount))
            if db_amount != supp_amount:
                raise SecurityValidationError(
                    error_code="AMOUNT_TAMPERING_DETECTED",
                    message=f"Amount mismatch detected! Stored authoritative amount is {db_amount}, supplied is {supp_amount}.",
                    transaction_id=payment.transaction_id
                )

    @classmethod
    def validate_recipient_integrity(
        cls,
        payment: Payment,
        supplied_recipient_id: Optional[str] = None
    ):
        """
        Guarantees recipient immutability.
        If caller/attacker attempts to modify recipient during execution, rejects transaction.
        """
        if supplied_recipient_id is not None:
            if payment.recipient_id != supplied_recipient_id:
                raise SecurityValidationError(
                    error_code="RECIPIENT_TAMPERING_DETECTED",
                    message=f"Recipient mismatch detected! Stored authoritative recipient is '{payment.recipient_id}', supplied is '{supplied_recipient_id}'.",
                    transaction_id=payment.transaction_id
                )

    @classmethod
    def validate_execution_eligibility(
        cls,
        db: Session,
        payment: Payment,
        required_status: str
    ):
        """
        Comprehensive security check prior to payment execution.
        """
        # 1. Expiration check
        cls.check_expiration(db, payment)

        # 2. State verification
        if payment.status != required_status:
            if payment.status in (PaymentStatus.SUCCESS.value, PaymentStatus.CONFIRMED.value, PaymentStatus.PROCESSING.value):
                raise SecurityValidationError(
                    error_code="ALREADY_PROCESSED",
                    message=f"Transaction has already been processed or confirmed. Current status: '{payment.status}'.",
                    transaction_id=payment.transaction_id
                )
            if payment.status == PaymentStatus.CANCELLED.value:
                raise SecurityValidationError(
                    error_code="PAYMENT_CANCELLED",
                    message="Transaction was cancelled by user.",
                    transaction_id=payment.transaction_id
                )
            if payment.status == PaymentStatus.BLOCKED.value:
                raise SecurityValidationError(
                    error_code="PAYMENT_BLOCKED",
                    message="Transaction has been blocked for security reasons.",
                    transaction_id=payment.transaction_id
                )
            raise SecurityValidationError(
                error_code="INVALID_STATE_TRANSITION",
                message=f"Payment status '{payment.status}' is not eligible for operation. Expected '{required_status}'.",
                transaction_id=payment.transaction_id
            )
