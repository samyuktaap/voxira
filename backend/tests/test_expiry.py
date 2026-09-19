import pytest
import uuid
from datetime import datetime, timezone, timedelta
from app.models.payment import Payment

def test_expired_payment_confirmation_blocked(client, auth_headers_user1, db_session):
    create_resp = client.post("/api/payments/intents", json={
        "amount": "500.00",
        "currency": "INR",
        "recipient_id": "rec_ravi",
        "recipient_name": "Ravi Kumar",
        "idempotency_key": f"key_{uuid.uuid4()}"
    }, headers=auth_headers_user1)
    tx_id = create_resp.json()["transaction_id"]

    client.post(f"/api/payments/{tx_id}/authenticate", json={"auth_assertion": "token"}, headers=auth_headers_user1)

    # Manually expire transaction in DB for test scenario
    payment = db_session.query(Payment).filter(Payment.transaction_id == tx_id).first()
    payment.expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    db_session.commit()

    # Attempt confirmation on expired transaction
    conf_resp = client.post(f"/api/payments/{tx_id}/confirm", json={"confirmed": True}, headers=auth_headers_user1)
    assert conf_resp.status_code == 400
    assert conf_resp.json()["detail"]["error_code"] == "PAYMENT_EXPIRED"
