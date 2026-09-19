from decimal import Decimal
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict

class RecipientInfo(BaseModel):
    id: str = Field(..., description="Unique recipient ID")
    name: str = Field(..., description="Recipient display name")

class PaymentIntentCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Payment amount as Decimal")
    currency: str = Field(default="INR", min_length=3, max_length=10)
    recipient_id: str = Field(..., min_length=1, description="Unique recipient ID")
    recipient_name: str = Field(..., min_length=1, description="Recipient display name")
    idempotency_key: str = Field(..., min_length=1, max_length=128, description="Unique client idempotency key")

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        return round(v, 2)

class PaymentAuthenticateRequest(BaseModel):
    auth_assertion: str = Field(..., min_length=1, description="Trusted device/platform biometric authentication token")
    auth_method: str = Field(default="device_biometric", description="Authentication mechanism e.g. webauthn, passkey, device_biometric")

class PaymentConfirmRequest(BaseModel):
    confirmed: bool = Field(..., description="Explicit confirmation boolean")

class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: str
    status: str
    next_action: str
    amount: Decimal
    currency: str
    recipient: RecipientInfo
    expires_at: datetime
    created_at: datetime
    provider: str
    provider_transaction_id: Optional[str] = None
    error_code: Optional[str] = None
    message: Optional[str] = None

class PaymentReceipt(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: str
    provider_transaction_id: Optional[str] = None
    amount: Decimal
    currency: str
    recipient: RecipientInfo
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    provider: str
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    idempotency_key: str

class WebhookPayload(BaseModel):
    event_id: str = Field(..., min_length=1)
    event_type: str = Field(..., min_length=1)
    transaction_id: Optional[str] = None
    provider_transaction_id: Optional[str] = None
    status: str = Field(..., min_length=1)
    raw_payload: Optional[Dict[str, Any]] = None

