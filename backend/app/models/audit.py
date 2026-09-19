import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, JSON
from app.database.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String(100), nullable=False, index=True)
    transaction_id = Column(String(36), nullable=True, index=True)
    user_id = Column(String(100), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    
    # Store redacted event context
    metadata_json = Column(JSON, nullable=True)
    
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    def __repr__(self):
        return f"<AuditLog(event_type='{self.event_type}', transaction_id='{self.transaction_id}', timestamp='{self.timestamp}')>"
