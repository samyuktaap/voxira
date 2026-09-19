import pytest
import uuid

def test_duplicate_confirmation_replay_protection(client, auth_headers_user1):
    create_resp = client.post("/api/payments/intents", json={
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_ravi",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    client.post(f"/api/payments/{tx_id}/authenticate", json={
        "auth_assertion": "token"
    }, headers=auth_headers_user1)

    # First confirmation
    conf1 = client.post(f"/api/payments/{tx_id}/confirm", json={"confirmed": True}, headers=auth_headers_user1)
    assert conf1.status_code == 200

    # Replayed second confirmation
    conf2 = client.post(f"/api/payments/{tx_id}/confirm", json={"confirmed": True}, headers=auth_headers_user1)
    assert conf2.status_code == 400
    assert conf2.json()["detail"]["error_code"] in ("ALREADY_PROCESSED", "INVALID_STATE_TRANSITION")
