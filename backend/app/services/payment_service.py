import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config import settings
from app.models.payment import Payment
from app.schemas.payment import (
    PaymentIntentCreate,
    PaymentAuthenticateRequest,
    PaymentConfirmRequest,
    PaymentResponse,
    PaymentReceipt,
    RecipientInfo
)
from app.security.authorization import AuthenticatedUser, verify_payment_ownership
from app.security.idempotency import IdempotencyService
from app.security.validation import SecurityValidationService, SecurityValidationError
from app.services.state_machine import PaymentStateMachine, PaymentStatus
from app.services.audit_service import AuditService
from app.services.providers.provider_factory import get_payment_provider

logger = logging.getLogger("blindpay.payment_service")

def utc_now():
    return datetime.now(timezone.utc)

class PaymentService:
    @staticmethod
    def _build_response(payment: Payment, error_code: Optional[str] = None, message: Optional[str] = None) -> PaymentResponse:
        next_action = PaymentStateMachine.get_next_action(payment.status)
        return PaymentResponse(
            transaction_id=payment.transaction_id,
            status=payment.status,
            next_action=next_action,
            amount=Decimal(str(payment.amount)),
            currency=payment.currency,
            recipient=RecipientInfo(id=payment.recipient_id, name=payment.recipient_name),
            expires_at=payment.expires_at,
            created_at=payment.created_at,
            provider=payment.provider,
            provider_transaction_id=payment.provider_transaction_id,
            error_code=error_code or payment.failure_code,
            message=message or payment.failure_reason
        )

    @classmethod
    def create_intent(
        cls,
        db: Session,
        current_user: AuthenticatedUser,
        intent_data: PaymentIntentCreate,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> PaymentResponse:
        # 1. Validate new intent data
        SecurityValidationService.validate_new_intent(
            amount=intent_data.amount,
            currency=intent_data.currency,
            recipient_id=intent_data.recipient_id,
            recipient_name=intent_data.recipient_name
        )

        # 2. Check Idempotency key
        existing_payment, is_duplicate = IdempotencyService.check_idempotency(
            db=db,
            user_id=current_user.id,
            idempotency_key=intent_data.idempotency_key,
            amount=intent_data.amount,
            currency=intent_data.currency,
            recipient_id=intent_data.recipient_id
        )

        if is_duplicate and existing_payment:
            logger.info(f"Idempotent request returning existing payment: {existing_payment.transaction_id}")
            AuditService.log_event(
                db=db,
                event_type="IDEMPOTENCY_REUSE",
                transaction_id=existing_payment.transaction_id,
                user_id=current_user.id,
                metadata={"idempotency_key": intent_data.idempotency_key},
                ip_address=ip_address,
                user_agent=user_agent
            )
            # Perform expiration check on existing payment
            try:
                SecurityValidationService.check_expiration(db, existing_payment)
            except SecurityValidationError:
                pass
            return cls._build_response(existing_payment)

        # 3. Create new payment record
        now = utc_now()
        expiry_seconds = settings.PAYMENT_INTENT_EXPIRY_SECONDS
        expires_at = now + timedelta(seconds=expiry_seconds)

        payment = Payment(
            id=str(uuid.uuid4()),
            transaction_id=str(uuid.uuid4()),
            user_id=current_user.id, # MUST come from backend auth context!
            amount=intent_data.amount,
            currency=intent_data.currency.upper(),
            recipient_id=intent_data.recipient_id,
            recipient_name=intent_data.recipient_name,
            status=PaymentStatus.CREATED.value,
            provider=settings.PAYMENT_PROVIDER,
            idempotency_key=intent_data.idempotency_key,
            nonce=str(uuid.uuid4()),
            created_at=now,
            updated_at=now,
            expires_at=expires_at
        )

        db.add(payment)
        db.commit()
        db.refresh(payment)

        # 4. Advance state machine: CREATED -> VALIDATED -> AUTH_REQUIRED
        try:
            payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.VALIDATED.value)
            payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.AUTH_REQUIRED.value)
            db.commit()
            db.refresh(payment)
        except StateTransitionError as e:
            db.rollback()
            raise SecurityValidationError("INVALID_STATE_TRANSITION", str(e))

        AuditService.log_event(
            db=db,
            event_type="PAYMENT_CREATED",
            transaction_id=payment.transaction_id,
            user_id=current_user.id,
            metadata={
                "amount": str(payment.amount),
                "currency": payment.currency,
                "recipient_id": payment.recipient_id
            },
            ip_address=ip_address,
            user_agent=user_agent
        )

        return cls._build_response(payment)

    @classmethod
    def authenticate_payment(
        cls,
        db: Session,
        current_user: AuthenticatedUser,
        transaction_id: str,
        auth_data: PaymentAuthenticateRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> PaymentResponse:
        payment = db.query(Payment).filter(Payment.transaction_id == transaction_id).first()
        if not payment:
            raise SecurityValidationError("TRANSACTION_NOT_FOUND", f"Transaction '{transaction_id}' not found.")

        verify_payment_ownership(payment, current_user)
        SecurityValidationService.validate_execution_eligibility(db, payment, required_status=PaymentStatus.AUTH_REQUIRED.value)

        payment.authentication_attempts += 1
        db.commit()

        # Perform device/platform authentication assertion verification
        if not auth_data.auth_assertion or len(auth_data.auth_assertion.strip()) == 0:
            AuditService.log_event(
                db=db,
                event_type="AUTHENTICATION_FAILED",
                transaction_id=payment.transaction_id,
                user_id=current_user.id,
                metadata={"reason": "Empty authentication assertion"},
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise SecurityValidationError("AUTHENTICATION_FAILED", "Biometric authentication assertion token is invalid or missing.")

        # Transition: AUTH_REQUIRED -> AUTHENTICATED -> CONFIRMATION_REQUIRED
        now = utc_now()
        payment.authenticated_at = now
        payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.AUTHENTICATED.value)
        payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.CONFIRMATION_REQUIRED.value)
        db.commit()
        db.refresh(payment)

        AuditService.log_event(
            db=db,
            event_type="AUTHENTICATION_SUCCESS",
            transaction_id=payment.transaction_id,
            user_id=current_user.id,
            metadata={"auth_method": auth_data.auth_method},
            ip_address=ip_address,
            user_agent=user_agent
        )

        return cls._build_response(payment)

    @classmethod
    def confirm_payment(
        cls,
        db: Session,
        current_user: AuthenticatedUser,
        transaction_id: str,
        confirm_data: PaymentConfirmRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> PaymentResponse:
        payment = db.query(Payment).filter(Payment.transaction_id == transaction_id).first()
        if not payment:
            raise SecurityValidationError("TRANSACTION_NOT_FOUND", f"Transaction '{transaction_id}' not found.")

        verify_payment_ownership(payment, current_user)
        SecurityValidationService.validate_execution_eligibility(db, payment, required_status=PaymentStatus.CONFIRMATION_REQUIRED.value)

        payment.confirmation_attempts += 1

        if not confirm_data.confirmed:
            payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.CANCELLED.value)
            db.commit()
            db.refresh(payment)
            
            AuditService.log_event(
                db=db,
                event_type="CONFIRMATION_CANCELLED",
                transaction_id=payment.transaction_id,
                user_id=current_user.id,
                ip_address=ip_address,
                user_agent=user_agent
            )
            return cls._build_response(payment)

        # Transition: CONFIRMATION_REQUIRED -> CONFIRMED -> PROCESSING
        now = utc_now()
        payment.confirmed_at = now
        payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.CONFIRMED.value)
        payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.PROCESSING.value)
        payment.processing_at = now
        db.commit()
        db.refresh(payment)

        AuditService.log_event(
            db=db,
            event_type="CONFIRMATION_SUCCESS",
            transaction_id=payment.transaction_id,
            user_id=current_user.id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        AuditService.log_event(
            db=db,
            event_type="PAYMENT_SUBMITTED",
            transaction_id=payment.transaction_id,
            user_id=current_user.id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Submit payment request to Provider Abstraction Layer
        provider = get_payment_provider(payment.provider)
        provider_resp = provider.create_payment(
            transaction_id=payment.transaction_id,
            amount=str(payment.amount),
            currency=payment.currency,
            recipient_id=payment.recipient_id,
            recipient_name=payment.recipient_name,
            idempotency_key=payment.idempotency_key
        )

        payment.provider_transaction_id = provider_resp.provider_transaction_id
        payment.provider_status = provider_resp.provider_status
        payment.provider_reference = provider_resp.provider_reference

        # Process authoritative provider status
        if provider_resp.provider_status == "SUCCESS":
            payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.SUCCESS.value)
            payment.completed_at = utc_now()
            AuditService.log_event(db, "PAYMENT_SUCCESS", payment.transaction_id, current_user.id)
        elif provider_resp.provider_status in ("FAILED", "REJECTED"):
            payment.status = PaymentStateMachine.transition(payment.status, PaymentStatus.FAILED.value)
            payment.failure_code = provider_resp.error_code or "PROVIDER_DECLINED"
            payment.failure_reason = provider_resp.error_message or "Provider rejected payment"
            AuditService.log_event(db, "PAYMENT_FAILED", payment.transaction_id, current_user.id)
        elif provider_resp.provider_status == "PENDING":
            # Retain PROCESSING / PENDING status - await provider webhook confirmation
            payment.status = PaymentStatus.PENDING.value
            AuditService.log_event(db, "PAYMENT_PENDING", payment.transaction_id, current_user.id)
        else:
            payment.status = PaymentStatus.UNKNOWN.value
            AuditService.log_event(db, "PAYMENT_UNKNOWN_STATUS", payment.transaction_id, current_user.id)

        db.commit()
        db.refresh(payment)

        return cls._build_response(payment)

    @classmethod
    def get_payment_details(
        cls,
        db: Session,
        current_user: AuthenticatedUser,
        transaction_id: str
    ) -> PaymentResponse:
        payment = db.query(Payment).filter(Payment.transaction_id == transaction_id).first()
        if not payment:
            raise SecurityValidationError("TRANSACTION_NOT_FOUND", f"Transaction '{transaction_id}' not found.")

        verify_payment_ownership(payment, current_user)
        
        try:
            SecurityValidationService.check_expiration(db, payment)
        except SecurityValidationError:
            pass

        return cls._build_response(payment)

    @classmethod
    def get_receipt(
        cls,
        db: Session,
        current_user: AuthenticatedUser,
        transaction_id: str
    ) -> PaymentReceipt:
        payment = db.query(Payment).filter(Payment.transaction_id == transaction_id).first()
        if not payment:
            raise SecurityValidationError("TRANSACTION_NOT_FOUND", f"Transaction '{transaction_id}' not found.")

        verify_payment_ownership(payment, current_user)

        return PaymentReceipt(
            transaction_id=payment.transaction_id,
            provider_transaction_id=payment.provider_transaction_id,
            amount=Decimal(str(payment.amount)),
            currency=payment.currency,
            recipient=RecipientInfo(id=payment.recipient_id, name=payment.recipient_name),
            status=payment.status,
            created_at=payment.created_at,
            completed_at=payment.completed_at,
            provider=payment.provider,
            failure_code=payment.failure_code,
            failure_reason=payment.failure_reason,
            idempotency_key=payment.idempotency_key
        )

    @classmethod
    def get_user_transactions(
        cls,
        db: Session,
        current_user: AuthenticatedUser,
        limit: int = 20
    ) -> List[PaymentResponse]:
        payments = db.query(Payment).filter(
            Payment.user_id == current_user.id
        ).order_by(Payment.created_at.desc()).limit(limit).all()

        return [cls._build_response(p) for p in payments]
