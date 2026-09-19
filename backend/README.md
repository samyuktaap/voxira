# BlindPay — Backend & Payment Engine (Supabase PostgreSQL Integration)

> **Notice:** This application uses **Supabase PostgreSQL** as its primary hosted database engine and connects to an official **TEST / SANDBOX** payment provider environment. Status is authoritative based on real provider sandbox responses and webhooks.

BlindPay is a voice-first accessible payment system designed primarily for blind and visually impaired users. This backend service enforces a security-critical state machine that separates Voice Intent Parsing, User Authentication, Explicit Confirmation, and Provider Execution.

---

## 1. System Architecture & Security Principles

The backend implements authoritative transaction validation, device authentication challenges, and security policy rules:
1. **Voice Input Safety Boundary**: Voice commands NEVER directly execute financial transactions. Voice acts solely as an input and conversational review layer.
2. **KYC Recipient Resolution**: Maps spoken recipient names to verified banking contacts (e.g. `ravi` -> `Ravi Kumar`).
3. **Amount & Recipient Integrity Protection**: Prevents amount or recipient tampering (e.g. altering ₹500 to ₹5000 in transit).
4. **Two-Step Authorization**: Transactions require device authentication (`POST /api/payments/{id}/authenticate`) prior to final explicit confirmation (`POST /api/payments/{id}/confirm`).
5. **Double-Payment & Replay Protection**: Idempotency keys and nonce tracking prevent duplicate charges.

```
                 ┌──────────────────┐
                 │ React Frontend   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Voice Interface  │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ FastAPI Backend  │
                 └────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
       Supabase Auth    Security   Payment Service
       JWT Context                 
                                      │
                                      ▼
                                SQLAlchemy ORM
                                      │
                                      ▼
                            Supabase PostgreSQL
                                 (RLS Enabled)

Payment Execution (Provider Authoritative):

Payment Service
      │
      ▼
Official Payment Provider Sandbox
      │
      ▼
Provider Status Confirmation
      │
      ▼
FastAPI → SQLAlchemy ORM → Supabase PostgreSQL
```

---

## 2. Supabase Integration Details

- **Database Engine:** Supabase Hosted PostgreSQL.
- **ORM & Access Layer:** SQLAlchemy ORM handles all payment database operations through FastAPI.
- **Connection Pooling:** Configured with `pool_size=5`, `max_overflow=10`, `pool_recycle=1800`, `pool_pre_ping=True` optimized for Supabase connection limits.
- **Supabase Auth & JWT:** FastAPI extracts and verifies `sub` (User ID) from Supabase JWT bearer tokens (`Authorization: Bearer <jwt>`). `current_user.id` is strictly derived from backend auth context.
- **Row Level Security (RLS):** Database migration `002_supabase_rls_policies.py` enables RLS policies on `payments` and `audit_logs` tables (`user_id = auth.uid()::text`).
- **Secrets Isolation:** Sensitive variables (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_API_SECRET`) are stored in secure backend environment variables and NEVER exposed to frontend clients.

---

## 3. Directory Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI entry point & exception handlers
│   ├── config.py                # Environment configuration & pydantic-settings
│   ├── api/                     # FastAPI route definitions (intents, auth, confirm, receipt, webhook, health)
│   ├── models/                  # SQLAlchemy models (Payment, AuditLog)
│   ├── schemas/                 # Pydantic schemas (Decimal precision money handling)
│   ├── services/
│   │   ├── state_machine.py     # Payment state machine transition enforcement
│   │   ├── payment_service.py   # Core payment processing service
│   │   ├── audit_service.py     # Security event audit logger (Redacted sensitive fields)
│   │   ├── payment_provider.py  # Abstract PaymentProvider interface
│   │   └── providers/           # Provider adapters (Sandbox, Razorpay)
│   ├── security/                # Security layer (validation, authorization, idempotency, rate limiting, encryption)
│   └── database/
│       ├── database.py          # SQLAlchemy pooled engine & SessionLocal
│       └── alembic/             # Database migrations (001_initial_schema, 002_supabase_rls_policies)
├── tests/                       # Complete pytest suite (lifecycle, tampering, replay, idempotency, encryption)
├── .env.example                 # Configuration template with Supabase fields
├── alembic.ini                  # Migration settings
├── requirements.txt             # Dependency specification
└── README.md
```

---

## 4. API Endpoints

- `GET /api/health`: Live health status & database ping.
- `POST /api/payments/intents`: Ingests parsed voice intent and creates a verified payment intent (`AUTH_REQUIRED`).
- `POST /api/payments/{transaction_id}/authenticate`: Verifies device biometric/platform authentication challenge.
- `POST /api/payments/{transaction_id}/confirm`: Authoritatively executes payment upon explicit user confirmation (`SUCCESS` / `PENDING` / `FAILED`).
- `GET /api/payments/{transaction_id}`: Authoritative payment status lookup.
- `GET /api/payments/{transaction_id}/receipt`: Generates official transaction receipt based on real DB status.
- `POST /api/payments/webhook`: Provider webhook ingestion with HMAC SHA-256 signature verification.

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env` and supply your Supabase connection parameters:

```ini
APP_ENV=development
APP_NAME=BlindPay Backend Payment Engine
SECRET_KEY=dev-secret-key-change-in-production-32bytes

# Supabase PostgreSQL Connection String (Transaction Pooler - Port 6543 or Direct - Port 5432)
DATABASE_URL=postgresql+psycopg://postgres.[project_ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require

# Supabase Auth & Project Credentials
SUPABASE_URL=https://your_supabase_ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Payment Provider Configuration
PAYMENT_PROVIDER=sandbox
PAYMENT_ENVIRONMENT=test
PAYMENT_API_KEY=test_key_dummy
PAYMENT_API_SECRET=test_secret_dummy
PAYMENT_WEBHOOK_SECRET=whsec_test_secret_12345

PAYMENT_INTENT_EXPIRY_SECONDS=300
```

---

## 6. Local Setup & Execution

```powershell
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run Alembic migrations against Supabase PostgreSQL
alembic upgrade head

# Run automated test suite
python -m pytest -v

# Start FastAPI server
uvicorn app.main:app --reload
```

Interactive OpenAPI Swagger documentation is available at `http://localhost:8000/docs`.
