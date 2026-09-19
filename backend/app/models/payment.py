import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, Integer, Text
from app.database.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String(36), unique=True, nullable=False, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(100), nullable=False, index=True)
    
    # Monetary value: NUMERIC/Decimal with 2 decimal places. NEVER float!
    amount = Column(Numeric(precision=14, scale=2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    
    recipient_id = Column(String(100), nullable=False, index=True)
    recipient_name = Column(String(200), nullable=False)
    
    # State Machine Status
    status = Column(String(50), nullable=False, default="CREATED", index=True)
    
    # Payment Provider attributes
    provider = Column(String(50), nullable=False, default="sandbox")
    provider_transaction_id = Column(String(100), nullable=True, index=True)
    provider_status = Column(String(50), nullable=True)
    provider_reference = Column(String(200), nullable=True)
    
    # Idempotency & Replay Protection
    idempotency_key = Column(String(128), nullable=False, index=True)
    nonce = Column(String(64), nullable=False, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    
    # Timestamps (Timezone aware UTC)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    authenticated_at = Column(DateTime(timezone=True), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    processing_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Diagnostics & Counters
    failure_code = Column(String(50), nullable=True)
    failure_reason = Column(Text, nullable=True)
    confirmation_attempts = Column(Integer, nullable=False, default=0)
    authentication_attempts = Column(Integer, nullable=False, default=0)

    def __repr__(self):
        return f"<Payment(transaction_id='{self.transaction_id}', amount={self.amount} {self.currency}, status='{self.status}')>"
