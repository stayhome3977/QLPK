from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Additional environment variables
    DEBUG: bool = False
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = Field(default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174")
    MAX_FILE_SIZE: int = 10485760
    UPLOAD_DIR: str = "uploads/"
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    APP_NAME: str = "QLPK Da Lieu API"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    BACKEND_CORS_ORIGINS: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")
    DATABASE_URL: str = "sqlite:///./qlpk.db"
    DEFAULT_ADMIN_EMAIL: str = "admin@qlpk.vn"
    DEFAULT_ADMIN_PASSWORD: str = "Admin@123"
    
    # Email Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = ""
    FROM_NAME: str = "QLPK Da Lieu"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in (self.CORS_ORIGINS or self.BACKEND_CORS_ORIGINS).split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
