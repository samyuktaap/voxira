"""
BlindPay FastAPI Companion Backend
Provides REST endpoints for payment intents, authentication simulation,
payment confirmation, and transaction tracking.
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from .models import (
    PaymentIntentRequest,
    PaymentIntentResponse,
    AuthVerificationRequest,
    PaymentConfirmationRequest,
    PaymentActionResponse,
    PaymentStatus,
)
from .security_engine import security_engine

app = FastAPI(
    title="BlindPay Backend API",
    description="Voice-First Accessibility Payment Sandbox and Security Engine",
    version="1.0.0"
)

# Enable CORS for Vite frontend (typically localhost:5173 or any port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "BlindPay Backend API",
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/payment/intents", response_model=PaymentIntentResponse)
def create_payment_intent(request: PaymentIntentRequest):
    """
    Ingest voice payment intent, perform security & bounds check,
    resolve KYC recipient, and return authoritative transaction object.
    """
    if request.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The payment amount must be greater than zero."
        )

    txn_id, pay_status, verified_name, message = security_engine.verify_payment_intent(request)

    return PaymentIntentResponse(
        transaction_id=txn_id,
        status=pay_status,
        amount=request.amount,
        currency=request.currency,
        recipient_name=verified_name,
        message=message,
        requires_auth=True,
        created_at=datetime.now(timezone.utc).isoformat()
    )


@app.post("/payment/authenticate", response_model=PaymentActionResponse)
def authenticate_transaction(req: AuthVerificationRequest):
    """
    Verify device authentication challenge (biometric/PIN simulation).
    Voice alone NEVER authorizes payment.
    """
    ok, message, pay_status = security_engine.verify_device_auth(req.transaction_id, req.auth_success)
    txn = security_engine.transactions.get(req.transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    if not ok and pay_status == PaymentStatus.BLOCKED:
        raise HTTPException(status_code=403, detail=message)

    return PaymentActionResponse(
        transaction_id=req.transaction_id,
        status=pay_status,
        amount=txn["amount"],
        currency=txn["currency"],
        recipient_name=txn["recipient_name"],
        message=message,
        completed_at=txn.get("completed_at")
    )


@app.post("/payment/confirm", response_model=PaymentActionResponse)
def confirm_payment(req: PaymentConfirmationRequest):
    """
    Explicit user confirmation after successful authentication.
    """
    ok, message, pay_status = security_engine.confirm_payment(req.transaction_id, req.explicit_confirmation)
    txn = security_engine.transactions.get(req.transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    if not ok:
        if pay_status == PaymentStatus.BLOCKED:
            raise HTTPException(status_code=403, detail=message)
        elif pay_status == PaymentStatus.AUTHENTICATION_REQUIRED:
            raise HTTPException(status_code=401, detail=message)

    return PaymentActionResponse(
        transaction_id=req.transaction_id,
        status=pay_status,
        amount=txn["amount"],
        currency=txn["currency"],
        recipient_name=txn["recipient_name"],
        message=message,
        completed_at=txn.get("completed_at")
    )


@app.post("/payment/cancel/{transaction_id}", response_model=PaymentActionResponse)
def cancel_payment(transaction_id: str):
    """
    Cancels an in-flight transaction.
    """
    ok, message = security_engine.cancel_transaction(transaction_id)
    txn = security_engine.transactions.get(transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    return PaymentActionResponse(
        transaction_id=transaction_id,
        status=PaymentStatus.CANCELLED,
        amount=txn["amount"],
        currency=txn["currency"],
        recipient_name=txn["recipient_name"],
        message=message
    )


@app.get("/payment/status/{transaction_id}", response_model=PaymentActionResponse)
def get_payment_status(transaction_id: str):
    """
    Fetch authoritative transaction status.
    """
    txn = security_engine.transactions.get(transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    return PaymentActionResponse(
        transaction_id=transaction_id,
        status=txn["status"],
        amount=txn["amount"],
        currency=txn["currency"],
        recipient_name=txn["recipient_name"],
        message=txn["message"],
        completed_at=txn.get("completed_at")
    )
