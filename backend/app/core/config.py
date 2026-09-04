import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "AyeFinance"
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database
    MONGODB_URL: str = "mongodb://localhost:27017/aye_finance_dev"
    DB_NAME: str = "aye_finance_dev"
    DATABASE_NAME: str = "aye_finance_dev"
    MONGODB_CERT_B64: str = ""
    MONGODB_CERT_PATH: str = ""

    # Security
    JWT_SECRET_KEY: str = "super_secure_secret_key_minimum_32_characters_for_ayeapps_atelier"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    TURNSTILE_SECRET_KEY: str = ""

    # CORS
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:3000",
        "http://localhost:3002",
        "https://finance.ayeapps.com",
    ]

    # Central Auth URL (optional integration)
    AYE_AUTH_URL: str = "http://localhost:8000/api/v1/auth"

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long.")
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                return ["*"]
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"


settings = Settings()
