from decimal import Decimal
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.payment import Payment

class IdempotencyException(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)

class IdempotencyService:
    @staticmethod
    def check_idempotency(
        db: Session,
        user_id: str,
        idempotency_key: str,
        amount: Decimal,
        currency: str,
        recipient_id: str
    ) -> Tuple[Optional[Payment], bool]:
        """
        Checks for previous transactions using the same idempotency key for the authenticated user.
        - Returns (existing_payment, True) if an identical request was already processed.
        - Raises IdempotencyException if the same key is reused with DIFFERENT parameters.
        - Returns (None, False) if the key is fresh and valid.
        """
        existing = db.query(Payment).filter(
            Payment.user_id == user_id,
            Payment.idempotency_key == idempotency_key
        ).first()

        if not existing:
            return None, False

        # Verify whether payment parameters match existing record
        amount_matches = (Decimal(str(existing.amount)) == Decimal(str(amount)))
        currency_matches = (existing.currency.upper() == currency.upper())
        recipient_matches = (existing.recipient_id == recipient_id)

        if amount_matches and currency_matches and recipient_matches:
            return existing, True
        else:
            raise IdempotencyException(
                code="IDEMPOTENCY_CONFLICT",
                message="Idempotency key reused with different payment parameters (amount, currency, or recipient)."
            )
