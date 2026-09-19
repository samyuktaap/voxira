import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.database import Base, engine
from app.api import health_router, auth_router, payment_router, webhook_router
from app.security.validation import SecurityValidationError
from app.security.idempotency import IdempotencyException
from app.services.state_machine import StateTransitionError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("blindpay.main")

# Auto-create tables for local development SQLite database
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.warning(f"Database table initialization notice: {e}")

app = FastAPI(
    title=settings.APP_NAME,
    description="BlindPay Voice-First Accessible Payment Engine - Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(payment_router)
app.include_router(webhook_router)

# Custom Exception Handlers returning predictable structured JSON
@app.exception_handler(SecurityValidationError)
async def security_validation_exception_handler(request: Request, exc: SecurityValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "transaction_id": exc.transaction_id
        }
    )

@app.exception_handler(StateTransitionError)
async def state_transition_exception_handler(request: Request, exc: StateTransitionError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error_code": "INVALID_STATE_TRANSITION",
            "message": str(exc),
            "current_state": exc.current_state,
            "target_state": exc.target_state
        }
    )

@app.exception_handler(IdempotencyException)
async def idempotency_exception_handler(request: Request, exc: IdempotencyException):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "error_code": exc.code,
            "message": exc.message
        }
    )

@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Server Error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An internal payment engine error occurred. Stack traces are redacted for security."
        }
    )
