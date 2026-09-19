from typing import List
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.payment import (
    PaymentIntentCreate,
    PaymentAuthenticateRequest,
    PaymentConfirmRequest,
    PaymentResponse,
    PaymentReceipt
)
from app.security.authorization import get_current_user, AuthenticatedUser
from app.security.rate_limiter import intent_rate_limiter, auth_rate_limiter, confirm_rate_limiter
from app.security.validation import SecurityValidationError
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/api/payments", tags=["Payment Engine"])

def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"

@router.post("/intents", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment_intent(
    intent_data: PaymentIntentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Create a payment intent from voice/parsed intent data.
    IMPORTANT: user_id comes strictly from backend auth context (`current_user.id`), NOT frontend payload!
    """
    intent_rate_limiter.check(current_user.id)
    ip_addr = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    try:
        return PaymentService.create_intent(
            db=db,
            current_user=current_user,
            intent_data=intent_data,
            ip_address=ip_addr,
            user_agent=user_agent
        )
    except SecurityValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": e.error_code,
                "message": e.message,
                "transaction_id": e.transaction_id
            }
        )

@router.post("/{transaction_id}/authenticate", response_model=PaymentResponse)
def authenticate_payment(
    transaction_id: str,
    auth_data: PaymentAuthenticateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Verify trusted device/platform biometric authentication token.
    Advances status: AUTH_REQUIRED -> AUTHENTICATED -> CONFIRMATION_REQUIRED
    """
    auth_rate_limiter.check(f"{current_user.id}:{transaction_id}")
    ip_addr = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    try:
        return PaymentService.authenticate_payment(
            db=db,
            current_user=current_user,
            transaction_id=transaction_id,
            auth_data=auth_data,
            ip_address=ip_addr,
            user_agent=user_agent
        )
    except SecurityValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": e.error_code,
                "message": e.message,
                "transaction_id": e.transaction_id
            }
        )

@router.post("/{transaction_id}/confirm", response_model=PaymentResponse)
def confirm_payment(
    transaction_id: str,
    confirm_data: PaymentConfirmRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Explicit user payment confirmation.
    Transitions: CONFIRMATION_REQUIRED -> CONFIRMED -> PROCESSING -> Provider Sandbox -> SUCCESS/FAILED/PENDING
    """
    confirm_rate_limiter.check(f"{current_user.id}:{transaction_id}")
    ip_addr = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    try:
        return PaymentService.confirm_payment(
            db=db,
            current_user=current_user,
            transaction_id=transaction_id,
            confirm_data=confirm_data,
            ip_address=ip_addr,
            user_agent=user_agent
        )
    except SecurityValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": e.error_code,
                "message": e.message,
                "transaction_id": e.transaction_id
            }
        )

@router.get("/{transaction_id}", response_model=PaymentResponse)
def get_payment_status(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Fetch authoritative status for a transaction owned by authenticated user."""
    try:
        return PaymentService.get_payment_details(
            db=db,
            current_user=current_user,
            transaction_id=transaction_id
        )
    except SecurityValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": e.error_code,
                "message": e.message,
                "transaction_id": e.transaction_id
            }
        )

@router.get("/{transaction_id}/receipt", response_model=PaymentReceipt)
def get_payment_receipt(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Fetch official transaction receipt based on real stored database status."""
    try:
        return PaymentService.get_receipt(
            db=db,
            current_user=current_user,
            transaction_id=transaction_id
        )
    except SecurityValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": e.error_code,
                "message": e.message,
                "transaction_id": e.transaction_id
            }
        )

@router.get("", response_model=List[PaymentResponse])
def get_user_payment_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Fetch authenticated user's transaction history."""
    return PaymentService.get_user_transactions(db=db, current_user=current_user, limit=limit)
