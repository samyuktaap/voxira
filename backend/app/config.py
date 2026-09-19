import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "BlindPay Backend Payment Engine"
    SECRET_KEY: str = "dev-secret-key-change-in-production-32bytes"

    # Supabase PostgreSQL Connection String
    DATABASE_URL: str = "sqlite:///./blindpay.db"

    # Supabase Project Secrets & Credentials
    SUPABASE_URL: Optional[str] = "https://your_supabase_ref.supabase.co"
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    PAYMENT_PROVIDER: str = "sandbox"
    PAYMENT_ENVIRONMENT: str = "test"
    PAYMENT_API_KEY: str = "test_key_dummy"
    PAYMENT_API_SECRET: str = "test_secret_dummy"
    PAYMENT_WEBHOOK_SECRET: str = "whsec_test_secret_12345"

    PAYMENT_INTENT_EXPIRY_SECONDS: int = 300

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS

settings = Settings()
