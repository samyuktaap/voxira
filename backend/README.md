# BlindPay Backend - Fintech Security Engine & Sandbox

This is the companion REST API for **BlindPay Module 1 (Voice Interaction + Accessibility System)**.

## Architecture

The backend implements authoritative transaction validation, device authentication challenges, and security policy rules:
1. **Voice Input Safety Boundary**: Voice commands NEVER directly execute financial transactions. Voice acts solely as an input and conversational review layer.
2. **KYC Recipient Resolution**: Maps spoken recipient names to verified banking contacts (e.g. `ravi` -> `Ravi Kumar (Verified)`).
3. **Voice Safety Limit**: Single voice transactions capped at ₹50,000. Amounts above this are flagged as `BLOCKED`.
4. **Amount Mismatch Detection**: Amount `9999` or transcripts containing `mismatch` trigger `BLOCKED` status to demonstrate the mismatch protection flow (Demo 2).
5. **Two-Step Authorization**: Transactions require device authentication (`/payment/authenticate`) prior to final execution (`/payment/confirm`).

## Endpoints

- `GET /`: Health check.
- `POST /payment/intents`: Ingests parsed voice intent and creates a verified transaction record (`REVIEW_REQUIRED` or `BLOCKED`).
- `POST /payment/authenticate`: Verifies device authentication challenge (biometric/PIN simulation).
- `POST /payment/confirm`: Authoritatively executes the transaction upon explicit user confirmation (`SUCCESS`).
- `POST /payment/cancel/{transaction_id}`: Aborts transaction and marks as `CANCELLED`.
- `GET /payment/status/{transaction_id}`: Authoritative status lookup.

## Running the Backend

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
