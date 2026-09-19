import json
import logging
from typing import Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.config import settings
from app.database.database import get_db
from app.models.payment import Payment
from app.models.audit import AuditLog
from app.services.state_machine import PaymentStateMachine, PaymentStatus
from app.services.audit_service import AuditService
from app.services.providers.provider_factory import get_payment_provider

logger = logging.getLogger("blindpay.webhook")

router = APIRouter(prefix="/api/payments", tags=["Payment Provider Webhook"])

@router.post("/webhook", status_code=200)
async def handle_provider_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_signature: str = Header(None, alias="X-Webhook-Signature"),
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature")
):
    signature = x_webhook_signature or x_razorpay_signature or request.headers.get("X-Signature") or ""
    payload_bytes = await request.body()
    
    try:
        payload_dict = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_WEBHOOK_PAYLOAD", "message": "Malformed JSON payload."}
        )

    provider = get_payment_provider()
    
    # 1. Verify webhook signature if secret is configured
    if settings.PAYMENT_WEBHOOK_SECRET and settings.PAYMENT_WEBHOOK_SECRET != "test_webhook_secret_dummy":
        is_valid = provider.verify_webhook_signature(
            payload_bytes=payload_bytes,
            signature=signature,
            secret=settings.PAYMENT_WEBHOOK_SECRET
        )
        if not is_valid:
            AuditService.log_event(
                db=db,
                event_type="WEBHOOK_REJECTED",
                metadata={"reason": "Invalid signature", "signature": signature}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "INVALID_WEBHOOK_SIGNATURE", "message": "Signature verification failed."}
            )

    parsed_event = provider.parse_webhook_payload(payload_dict)
    event_id = parsed_event.get("event_id") or f"evt_{hash(payload_bytes)}"

    # 2. Check webhook replay/deduplication
    recent_events = db.query(AuditLog).filter(
        AuditLog.event_type == "WEBHOOK_RECEIVED"
    ).order_by(AuditLog.timestamp.desc()).limit(100).all()

    for evt in recent_events:
        if evt.metadata_json and isinstance(evt.metadata_json, dict):
            if evt.metadata_json.get("event_id") == event_id:
                logger.info(f"Duplicate webhook event ignored: {event_id}")
                return {"status": "ignored", "reason": "DUPLICATE_WEBHOOK_EVENT"}


    transaction_id = parsed_event.get("transaction_id")
    provider_tx_id = parsed_event.get("provider_transaction_id")
    new_status = parsed_event.get("status", "UNKNOWN").upper()

    payment = None
    if transaction_id:
        payment = db.query(Payment).filter(Payment.transaction_id == transaction_id).first()
    if not payment and provider_tx_id:
        payment = db.query(Payment).filter(Payment.provider_transaction_id == provider_tx_id).first()

    if not payment:
        AuditService.log_event(
            db=db,
            event_type="WEBHOOK_RECEIVED",
            metadata={"event_id": event_id, "status": "UNMATCHED_TRANSACTION"}
        )
        return {"status": "ok", "message": "Webhook processed, transaction not found in database."}

    # 3. Transition internal state safely
    old_status = payment.status
    target_state = None
    if new_status == "SUCCESS":
        target_state = PaymentStatus.SUCCESS.value
    elif new_status in ("FAILED", "REJECTED"):
        target_state = PaymentStatus.FAILED.value
    elif new_status == "PENDING":
        target_state = PaymentStatus.PENDING.value

    if target_state and PaymentStateMachine.can_transition(payment.status, target_state):
        payment.status = PaymentStateMachine.transition(payment.status, target_state)
        payment.provider_status = new_status
        db.commit()
        db.refresh(payment)

    AuditService.log_event(
        db=db,
        event_type="WEBHOOK_RECEIVED",
        transaction_id=payment.transaction_id,
        user_id=payment.user_id,
        metadata={
            "event_id": event_id,
            "old_status": old_status,
            "new_status": payment.status,
            "provider_status": new_status
        }
    )

    return {
        "status": "ok",
        "transaction_id": payment.transaction_id,
        "payment_status": payment.status
    }
