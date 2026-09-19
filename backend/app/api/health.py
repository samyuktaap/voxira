from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings
from app.database.database import get_db

router = APIRouter(tags=["Health"])

@router.get("/api/health", status_code=200)
def health_check(db: Session = Depends(get_db)):
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    return {
        "status": "ok" if db_connected else "degraded",
        "database": "connected" if db_connected else "disconnected",
        "app": settings.APP_NAME,
        "environment": settings.PAYMENT_ENVIRONMENT,
        "provider": settings.PAYMENT_PROVIDER
    }

