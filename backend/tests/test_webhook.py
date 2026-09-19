import pytest
import json
import uuid
import hmac
import hashlib
from app.config import settings

def compute_signature(payload_bytes: bytes, secret: str = None) -> str:
    sec = secret or settings.PAYMENT_WEBHOOK_SECRET
    return hmac.new(sec.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()

def test_webhook_unmatched_transaction_graceful_handling(client):
    payload = {
        "event_id": f"evt_{uuid.uuid4()}",
        "event_type": "payment.captured",
        "transaction_id": str(uuid.uuid4()),
        "status": "SUCCESS"
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    sig = compute_signature(payload_bytes)

    response = client.post(
        "/api/payments/webhook",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Webhook-Signature": sig}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_webhook_invalid_signature_rejected(client):
    payload = {
        "event_id": f"evt_{uuid.uuid4()}",
        "event_type": "payment.captured",
        "transaction_id": str(uuid.uuid4()),
        "status": "SUCCESS"
    }
    payload_bytes = json.dumps(payload).encode("utf-8")

    response = client.post(
        "/api/payments/webhook",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Webhook-Signature": "invalid_signature_hash"}
    )
    assert response.status_code == 400
    assert response.json()["detail"]["error_code"] == "INVALID_WEBHOOK_SIGNATURE"

def test_webhook_duplicate_event_deduplication(client, auth_headers_user1):
    # 1. Create intent
    create_resp = client.post("/api/payments/intents", json={
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_ravi",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    event_id = f"evt_unique_{uuid.uuid4()}"
    webhook_payload = {
        "event_id": event_id,
        "event_type": "payment.captured",
        "transaction_id": tx_id,
        "status": "SUCCESS"
    }
    payload_bytes = json.dumps(webhook_payload).encode("utf-8")
    sig = compute_signature(payload_bytes)
    headers = {"Content-Type": "application/json", "X-Webhook-Signature": sig}

    # First webhook submission
    resp1 = client.post("/api/payments/webhook", content=payload_bytes, headers=headers)
    assert resp1.status_code == 200

    # Duplicate webhook submission with same event_id
    resp2 = client.post("/api/payments/webhook", content=payload_bytes, headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "ignored"
    assert resp2.json()["reason"] == "DUPLICATE_WEBHOOK_EVENT"
