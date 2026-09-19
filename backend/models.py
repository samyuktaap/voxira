from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class PaymentStatus(str, Enum):
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED"
    CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"
    BLOCKED = "BLOCKED"
    EXPIRED = "EXPIRED"
    PROCESSING = "PROCESSING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class PaymentIntentRequest(BaseModel):
    intent: str = Field(..., description="Detected intent (e.g. CREATE_PAYMENT)")
    amount: float = Field(..., gt=0, description="Amount in specified currency")
    currency: str = Field(default="INR", max_length=5, description="ISO currency code")
    recipient_name: str = Field(..., min_length=1, max_length=100, description="Name or contact of recipient")
    raw_transcript: str = Field(..., max_length=500, description="Raw speech-to-text transcript")


class PaymentIntentResponse(BaseModel):
    transaction_id: str
    status: PaymentStatus
    amount: float
    currency: str
    recipient_name: str
    message: str
    requires_auth: bool = True
    created_at: str


class AuthVerificationRequest(BaseModel):
    transaction_id: str
    auth_method: str = Field(default="device_biometric_simulation", description="Simulated device auth method")
    auth_success: bool = Field(default=True, description="Whether device authorized")


class PaymentConfirmationRequest(BaseModel):
    transaction_id: str
    explicit_confirmation: bool = Field(..., description="User explicit voice or tap confirmation")


class PaymentActionResponse(BaseModel):
    transaction_id: str
    status: PaymentStatus
    amount: float
    currency: str
    recipient_name: str
    message: str
    completed_at: Optional[str] = None
