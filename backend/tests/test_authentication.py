import pytest
import uuid

def test_payment_authentication_lifecycle(client, auth_headers_user1):
    # 1. Create Intent
    create_resp = client.post("/api/payments/intents", json={
        "amount": "750.00",
        "currency": "INR",
        "recipient_id": "rec_priya",
        "recipient_name": "Priya Sharma",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    # 2. Authenticate with trusted biometric assertion token
    auth_resp = client.post(f"/api/payments/{tx_id}/authenticate", json={
        "auth_assertion": "assertion_token_valid_123",
        "auth_method": "device_biometric"
    }, headers=auth_headers_user1)

    assert auth_resp.status_code == 200
    data = auth_resp.json()
    assert data["status"] == "CONFIRMATION_REQUIRED"
    assert data["next_action"] == "CONFIRM"

def test_payment_authentication_empty_token(client, auth_headers_user1):
    create_resp = client.post("/api/payments/intents", json={
        "amount": "100.00",
        "currency": "INR",
        "recipient_id": "rec_priya",
        "recipient_name": "Priya",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    auth_resp = client.post(f"/api/payments/{tx_id}/authenticate", json={
        "auth_assertion": "   ",
        "auth_method": "device_biometric"
    }, headers=auth_headers_user1)

    assert auth_resp.status_code == 400
    assert auth_resp.json()["detail"]["error_code"] == "AUTHENTICATION_FAILED"
