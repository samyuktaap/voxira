import logging
from app.config import settings
from app.services.payment_provider import PaymentProvider
from app.services.providers.sandbox_provider import OfficialSandboxPaymentProvider
from app.services.providers.razorpay_provider import RazorpayTestPaymentProvider

logger = logging.getLogger("blindpay.provider_factory")

def get_payment_provider(provider_name: str = None) -> PaymentProvider:
    provider_type = (provider_name or settings.PAYMENT_PROVIDER or "sandbox").lower()
    
    if provider_type in ("razorpay", "razorpay_test"):
        logger.info("Initializing RazorpayTestPaymentProvider")
        return RazorpayTestPaymentProvider(
            api_key=settings.PAYMENT_API_KEY,
            api_secret=settings.PAYMENT_API_SECRET,
            webhook_secret=settings.PAYMENT_WEBHOOK_SECRET
        )
    else:
        logger.info("Initializing OfficialSandboxPaymentProvider")
        return OfficialSandboxPaymentProvider(
            api_key=settings.PAYMENT_API_KEY,
            api_secret=settings.PAYMENT_API_SECRET,
            webhook_secret=settings.PAYMENT_WEBHOOK_SECRET,
            environment=settings.PAYMENT_ENVIRONMENT
        )
