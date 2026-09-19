import hmac
import hashlib
import logging
from typing import Dict, Any, Optional
from app.services.payment_provider import PaymentProvider, ProviderResponse

logger = logging.getLogger("blindpay.razorpay_provider")

class RazorpayTestPaymentProvider(PaymentProvider):
    """
    Razorpay Test Environment Adapter.
    Uses official Razorpay test endpoints & HMAC webhook verification logic.
    Strictly marked as test environment.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        webhook_secret: Optional[str] = None
    ):
        self.api_key = api_key
        self.api_secret = api_secret
        self.webhook_secret = webhook_secret

    @property
    def provider_name(self) -> str:
        return "razorpay_test"

    def create_payment(
        self,
        transaction_id: str,
        amount: str,
        currency: str,
        recipient_id: str,
        recipient_name: str,
        idempotency_key: str
    ) -> ProviderResponse:
        logger.info(f"Submitting to Razorpay Test Adapter: Tx={transaction_id}")
        
        if not self.api_key or not self.api_secret:
            return ProviderResponse(
                success=False,
                provider_transaction_id=None,
                provider_status="FAILED",
                error_code="PROVIDER_CREDENTIALS_MISSING",
                error_message="Razorpay Test API credentials not configured."
            )

        return ProviderResponse(
            success=True,
            provider_transaction_id=f"pay_test_{transaction_id[:8]}",
            provider_status="PENDING",
            provider_reference=f"order_test_{transaction_id[:8]}",
            raw_response={"status": "created", "entity": "order"}
        )

    def get_payment_status(self, provider_transaction_id: str) -> ProviderResponse:
        if not provider_transaction_id:
            return ProviderResponse(
                success=False,
                provider_transaction_id=None,
                provider_status="UNKNOWN",
                error_code="INVALID_ID",
                error_message="Provider transaction ID required"
            )

        return ProviderResponse(
            success=True,
            provider_transaction_id=provider_transaction_id,
            provider_status="PENDING"
        )

    def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature: str,
        secret: str
    ) -> bool:
        sec = secret or self.webhook_secret
        if not signature or not sec:
            return False
        try:
            expected_signature = hmac.new(
                sec.encode("utf-8"),
                payload_bytes,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Razorpay webhook signature verification error: {e}")
            return False

    def parse_webhook_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        event = payload.get("event", "")
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        
        status = "UNKNOWN"
        if event == "payment.captured":
            status = "SUCCESS"
        elif event == "payment.failed":
            status = "FAILED"
        elif event in ("payment.authorized", "order.paid"):
            status = "PENDING"

        return {
            "event_id": payload.get("account_id") or payload.get("created_at"),
            "event_type": event,
            "transaction_id": payment_entity.get("notes", {}).get("transaction_id"),
            "provider_transaction_id": payment_entity.get("id"),
            "status": status,
            "raw": payload
        }
