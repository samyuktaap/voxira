import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

logger = logging.getLogger("blindpay.audit")

SENSITIVE_KEYS = {
    "password", "token", "auth_assertion", "biometric", "fingerprint",
    "api_key", "secret", "cvv", "card_number", "private_key"
}

def redact_dict(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not data:
        return data
    cleaned = {}
    for key, val in data.items():
        if any(sens in key.lower() for sens in SENSITIVE_KEYS):
            cleaned[key] = "[REDACTED]"
        elif isinstance(val, dict):
            cleaned[key] = redact_dict(val)
        else:
            cleaned[key] = val
    return cleaned

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        event_type: str,
        transaction_id: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        clean_metadata = redact_dict(metadata)
        
        audit_entry = AuditLog(
            event_type=event_type,
            transaction_id=transaction_id,
            user_id=user_id,
            metadata_json=clean_metadata,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_entry)
        try:
            db.commit()
            db.refresh(audit_entry)
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to write audit log: {e}")
            
        logger.info(f"[AUDIT] Event={event_type} | TxID={transaction_id} | User={user_id}")
        return audit_entry
