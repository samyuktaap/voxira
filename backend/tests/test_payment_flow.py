import pytest
import uuid

def test_full_payment_lifecycle_e2e(client, auth_headers_user1):
    # STEP 1: VOICE INTENT / CREATE PAYMENT INTENT
    # Voice command: "Pay ₹500 to Ravi"
    intent_payload = {
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_ravi_99",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_e2e_{uuid.uuid4()}"
    }

    intent_resp = client.post("/api/payments/intents", json=intent_payload, headers=auth_headers_user1)
    assert intent_resp.status_code == 201
    intent_data = intent_resp.json()
    
    tx_id = intent_data["transaction_id"]
    assert intent_data["status"] == "AUTH_REQUIRED"
    assert intent_data["next_action"] == "AUTHENTICATE"
    assert intent_data["amount"] == "500.00"
    assert intent_data["currency"] == "INR"

    # STEP 2: BIOMETRIC / DEVICE AUTHENTICATION
    auth_payload = {
        "auth_assertion": "trusted_passkey_assertion_xyz789",
        "auth_method": "webauthn"
    }

    auth_resp = client.post(f"/api/payments/{tx_id}/authenticate", json=auth_payload, headers=auth_headers_user1)
    assert auth_resp.status_code == 200
    auth_data = auth_resp.json()
    
    assert auth_data["status"] == "CONFIRMATION_REQUIRED"
    assert auth_data["next_action"] == "CONFIRM"

    # STEP 3: EXPLICIT USER CONFIRMATION
    confirm_payload = {"confirmed": True}

    confirm_resp = client.post(f"/api/payments/{tx_id}/confirm", json=confirm_payload, headers=auth_headers_user1)
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    
    assert confirm_data["status"] in ("PROCESSING", "PENDING", "SUCCESS")

    # STEP 4: FETCH PAYMENT STATUS
    status_resp = client.get(f"/api/payments/{tx_id}", headers=auth_headers_user1)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["transaction_id"] == tx_id

    # STEP 5: FETCH RECEIPT
    receipt_resp = client.get(f"/api/payments/{tx_id}/receipt", headers=auth_headers_user1)
    assert receipt_resp.status_code == 200
    receipt_data = receipt_resp.json()
    
    assert receipt_data["transaction_id"] == tx_id
    assert receipt_data["amount"] == "500.00"
    assert receipt_data["currency"] == "INR"
    assert receipt_data["recipient"]["name"] == "Ravi Kumar"
