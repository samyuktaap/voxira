import pytest
import uuid

def test_payment_confirmation_success(client, auth_headers_user1):
    # 1. Create intent
    create_resp = client.post("/api/payments/intents", json={
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_ravi",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    # 2. Authenticate
    client.post(f"/api/payments/{tx_id}/authenticate", json={
        "auth_assertion": "valid_token",
        "auth_method": "passkey"
    }, headers=auth_headers_user1)

    # 3. Confirm
    confirm_resp = client.post(f"/api/payments/{tx_id}/confirm", json={
        "confirmed": True
    }, headers=auth_headers_user1)

    assert confirm_resp.status_code == 200
    data = confirm_resp.json()
    assert data["status"] in ("PROCESSING", "PENDING", "SUCCESS")
    assert "transaction_id" in data

def test_payment_confirmation_cancelled_by_user(client, auth_headers_user1):
    create_resp = client.post("/api/payments/intents", json={
        "amount": "300.00",
        "currency": "INR",
        "recipient_id": "rec_ravi",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    client.post(f"/api/payments/{tx_id}/authenticate", json={
        "auth_assertion": "valid_token"
    }, headers=auth_headers_user1)

    confirm_resp = client.post(f"/api/payments/{tx_id}/confirm", json={
        "confirmed": False
    }, headers=auth_headers_user1)

    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "CANCELLED"

def test_confirmation_bypassing_authentication_blocked(client, auth_headers_user1):
    create_resp = client.post("/api/payments/intents", json={
        "amount": "400.00",
        "currency": "INR",
        "recipient_id": "rec_ravi",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    # Attempt confirmation directly without calling /authenticate
    confirm_resp = client.post(f"/api/payments/{tx_id}/confirm", json={
        "confirmed": True
    }, headers=auth_headers_user1)

    assert confirm_resp.status_code == 400
    assert confirm_resp.json()["detail"]["error_code"] == "INVALID_STATE_TRANSITION"
