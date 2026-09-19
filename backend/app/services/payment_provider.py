from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class ProviderResponse:
    def __init__(
        self,
        success: bool,
        provider_transaction_id: Optional[str],
        provider_status: str,
        provider_reference: Optional[str] = None,
        raw_response: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        self.success = success
        self.provider_transaction_id = provider_transaction_id
        self.provider_status = provider_status
        self.provider_reference = provider_reference
        self.raw_response = raw_response or {}
        self.error_code = error_code
        self.error_message = error_message

class PaymentProvider(ABC):
    """Abstract interface for legitimate payment provider integrations (Test/Sandbox)."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    def create_payment(
        self,
        transaction_id: str,
        amount: str,
        currency: str,
        recipient_id: str,
        recipient_name: str,
        idempotency_key: str
    ) -> ProviderResponse:
        """Submit payment request to provider sandbox/test environment."""
        pass

    @abstractmethod
    def get_payment_status(self, provider_transaction_id: str) -> ProviderResponse:
        """Fetch authoritative payment status from provider."""
        pass

    @abstractmethod
    def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """Verify authenticity of incoming provider webhook."""
        pass

    @abstractmethod
    def parse_webhook_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse provider-specific webhook payload into normalized format."""
        pass
