from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AirGuard AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_airguard_sih_hackathon_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # DB URL default to SQLite for zero-config local runs, can override to Postgres
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./airguard.db")
    
    # Mail settings (Mocked in the code by default)
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = 587
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_USER: Optional[str] = "airguard.sih@gmail.com"
    SMTP_PASSWORD: Optional[str] = "app_password"
    EMAILS_FROM_EMAIL: Optional[str] = "noreply@airguard-ai.gov.in"
    EMAILS_FROM_NAME: str = "AirGuard AI Alert System"
    
    # Initial Admin Seed Info
    FIRST_SUPERUSER_EMAIL: str = "admin@airguard.gov.in"
    FIRST_SUPERUSER_PASSWORD: str = "Admin@12345"

    class Config:
        case_sensitive = True

settings = Settings()
