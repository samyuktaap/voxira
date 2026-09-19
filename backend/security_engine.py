"""
BlindPay Mock Security Engine
Simulates fintech security policy verification, idempotency checking,
fraud detection rules, amount mismatch detection, and rate limiting.
"""
from datetime import datetime, timezone
import uuid
from typing import Dict, Any, Tuple
from .models import PaymentStatus, PaymentIntentRequest


class SecurityEngine:
    def __init__(self):
        # In-memory transaction store: txn_id -> txn_record
        self.transactions: Dict[str, Dict[str, Any]] = {}
        # Maximum allowable single voice transaction limit
        self.MAX_VOICE_TRANSACTION_LIMIT = 50000.0  # 50,000 INR
        # Recipient registry lookup (maps nickname to verified full KYC name)
        self.known_recipients: Dict[str, str] = {
            "ravi": "Ravi Kumar (Verified)",
            "priya": "Priya Sharma (Verified)",
            "amit": "Amit Patel (Verified)",
            "sneha": "Sneha Reddy (Verified)",
            "rahul": "Rahul Verma (Verified)",
            "ananya": "Ananya Roy (Verified)"
        }

    def verify_payment_intent(self, request: PaymentIntentRequest) -> Tuple[str, PaymentStatus, str, str]:
        """
        Validates the extracted intent against financial risk rules:
        - Demo Rule 1: Amounts above 50,000 INR are BLOCKED (exceeds voice safety limit).
        - Demo Rule 2: Amount of exactly 9999 or phrases with 'blocked' simulate mismatch/risk trigger.
        - Resolves recipient to verified KYC name.
        """
        txn_id = f"txn_{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc).isoformat()

        # Check for blocked simulation conditions (Demo 2 requirement)
        if request.amount > self.MAX_VOICE_TRANSACTION_LIMIT:
            status = PaymentStatus.BLOCKED
            message = (
                f"Payment blocked. The requested amount of ₹{request.amount:,.2f} exceeds "
                f"the voice transaction safety limit of ₹{self.MAX_VOICE_TRANSACTION_LIMIT:,.2f}."
            )
        elif request.amount == 9999 or "mismatch" in request.raw_transcript.lower() or "blocked" in request.raw_transcript.lower():
            status = PaymentStatus.BLOCKED
            message = "Payment blocked. The requested amount does not match the payment details or security policy."
        else:
            status = PaymentStatus.REVIEW_REQUIRED
            message = "Review payment details before authentication."

        # KYC recipient resolution
        clean_key = request.recipient_name.strip().lower()
        verified_name = self.known_recipients.get(clean_key, f"{request.recipient_name.strip().title()} (Contact)")

        self.transactions[txn_id] = {
            "transaction_id": txn_id,
            "status": status,
            "amount": request.amount,
            "currency": request.currency,
            "recipient_name": verified_name,
            "raw_transcript": request.raw_transcript,
            "message": message,
            "requires_auth": True,
            "is_authenticated": False,
            "created_at": now,
            "completed_at": None,
        }

        return txn_id, status, verified_name, message

    def verify_device_auth(self, txn_id: str, success: bool) -> Tuple[bool, str, PaymentStatus]:
        txn = self.transactions.get(txn_id)
        if not txn:
            return False, "Transaction not found.", PaymentStatus.FAILED

        if txn["status"] == PaymentStatus.BLOCKED:
            return False, "Cannot authenticate a blocked transaction.", PaymentStatus.BLOCKED

        if not success:
            txn["status"] = PaymentStatus.FAILED
            txn["message"] = "Device authentication failed."
            return False, txn["message"], PaymentStatus.FAILED

        txn["is_authenticated"] = True
        txn["status"] = PaymentStatus.CONFIRMATION_REQUIRED
        txn["message"] = "Device authentication successful. Please confirm payment."
        return True, txn["message"], txn["status"]

    def confirm_payment(self, txn_id: str, explicit: bool) -> Tuple[bool, str, PaymentStatus]:
        txn = self.transactions.get(txn_id)
        if not txn:
            return False, "Transaction not found.", PaymentStatus.FAILED

        if txn["status"] == PaymentStatus.BLOCKED:
            return False, "Cannot execute a blocked transaction.", PaymentStatus.BLOCKED

        if not txn.get("is_authenticated"):
            return False, "Payment cannot be confirmed without prior authentication.", PaymentStatus.AUTHENTICATION_REQUIRED

        if not explicit:
            txn["status"] = PaymentStatus.CANCELLED
            txn["message"] = "Payment was not explicitly confirmed."
            return False, txn["message"], PaymentStatus.CANCELLED

        # Execution success
        txn["status"] = PaymentStatus.SUCCESS
        txn["message"] = f"Payment of ₹{txn['amount']:,.2f} to {txn['recipient_name']} completed successfully."
        txn["completed_at"] = datetime.now(timezone.utc).isoformat()
        return True, txn["message"], PaymentStatus.SUCCESS

    def cancel_transaction(self, txn_id: str) -> Tuple[bool, str]:
        txn = self.transactions.get(txn_id)
        if not txn:
            return False, "Transaction not found."
        txn["status"] = PaymentStatus.CANCELLED
        txn["message"] = "Transaction was cancelled by the user."
        return True, txn["message"]


# Singleton security engine instance
security_engine = SecurityEngine()
