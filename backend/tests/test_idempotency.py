import pytest
import uuid

def test_idempotency_same_key_same_data_returns_original(client, auth_headers_user1):
    idempotency_key = f"key_shared_{uuid.uuid4()}"
    payload = {
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_ravi",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": idempotency_key
    }

    resp1 = client.post("/api/payments/intents", json=payload, headers=auth_headers_user1)
    assert resp1.status_code == 201
    tx1 = resp1.json()["transaction_id"]

    # Repeat exact request with same idempotency key
    resp2 = client.post("/api/payments/intents", json=payload, headers=auth_headers_user1)
    assert resp2.status_code == 201
    tx2 = resp2.json()["transaction_id"]

    assert tx1 == tx2

def test_idempotency_conflict_different_data(client, auth_headers_user1):
    idempotency_key = f"key_conflict_{uuid.uuid4()}"
    payload1 = {
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_ravi",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": idempotency_key
    }

    resp1 = client.post("/api/payments/intents", json=payload1, headers=auth_headers_user1)
    assert resp1.status_code == 201

    # Same key but changed amount (₹500 -> ₹5000)
    payload2 = {
        "amount": "5000.00",
        "currency": "INR",
        "recipient_id": "rec_ravi",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": idempotency_key
    }
    resp2 = client.post("/api/payments/intents", json=payload2, headers=auth_headers_user1)
    assert resp2.status_code == 409
    assert resp2.json()["error_code"] == "IDEMPOTENCY_CONFLICT"

