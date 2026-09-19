import pytest
import uuid

def test_create_payment_intent_success(client, auth_headers_user1):
    payload = {
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_ravi_123",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }
    response = client.post("/api/payments/intents", json=payload, headers=auth_headers_user1)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "AUTH_REQUIRED"
    assert data["next_action"] == "AUTHENTICATE"
    assert data["amount"] == "500.00"
    assert data["currency"] == "INR"
    assert data["recipient"]["name"] == "Ravi Kumar"
    assert "transaction_id" in data

def test_create_payment_intent_invalid_amount(client, auth_headers_user1):
    payload = {
        "amount": "-50.00",
        "currency": "INR",
        "recipient_id": "rec_ravi_123",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }
    response = client.post("/api/payments/intents", json=payload, headers=auth_headers_user1)
    assert response.status_code == 422 # Pydantic validation failure for gt=0

def test_create_payment_intent_zero_amount(client, auth_headers_user1):
    payload = {
        "amount": "0.00",
        "currency": "INR",
        "recipient_id": "rec_ravi_123",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }
    response = client.post("/api/payments/intents", json=payload, headers=auth_headers_user1)
    assert response.status_code == 422

def test_create_payment_intent_unsupported_currency(client, auth_headers_user1):
    payload = {
        "amount": "100.00",
        "currency": "XYZ",
        "recipient_id": "rec_ravi_123",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }
    response = client.post("/api/payments/intents", json=payload, headers=auth_headers_user1)
    assert response.status_code == 400
    assert response.json()["detail"]["error_code"] == "INVALID_CURRENCY"
