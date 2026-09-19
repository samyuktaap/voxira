import pytest
import uuid

def test_unauthorized_user_access_blocked(client, auth_headers_user1, auth_headers_user2):
    # User 1 creates intent
    create_resp = client.post("/api/payments/intents", json={
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_123",
        "recipient_name": "Recipient",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    # User 2 attempts to view User 1's transaction
    get_resp = client.get(f"/api/payments/{tx_id}", headers=auth_headers_user2)
    assert get_resp.status_code == 403
    assert get_resp.json()["detail"]["error_code"] == "UNAUTHORIZED_TRANSACTION"

def test_unauthorized_user_authentication_blocked(client, auth_headers_user1, auth_headers_user2):
    create_resp = client.post("/api/payments/intents", json={
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_123",
        "recipient_name": "Recipient",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    # User 2 attempts to authenticate User 1's transaction
    auth_resp = client.post(f"/api/payments/{tx_id}/authenticate", json={
        "auth_assertion": "token"
    }, headers=auth_headers_user2)
    assert auth_resp.status_code == 403
