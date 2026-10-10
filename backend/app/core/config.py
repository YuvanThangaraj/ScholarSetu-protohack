from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SCHOLARSETU AI"
    PROJECT_DESCRIPTION: str = "Scholarship application review backend"
    VERSION: str = "1.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = ""
    AUTO_CREATE_SCHEMA: bool = False
    RUN_MIGRATIONS_ON_STARTUP: bool = False
    SEED_DEFAULT_SCHEMES: bool = False

    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "scholarship-documents"
    STORAGE_ROOT: str = "./private_uploads"
    STORAGE_SIGNED_URL_TTL_SECONDS: int = 300

    JWT_ALGORITHM: str = "HS256"
    JWT_AUDIENCE: str = "authenticated"

    OCR_MODE: str = "real"  # real or demo; demo must be explicitly selected
    OCR_ENGINE: str = "tesseract"
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024
    MIN_CONFIDENCE_THRESHOLD: float = 0.65
    FUZZY_NAME_MATCH_THRESHOLD: float = 80.0
    FUZZY_INSTITUTION_MATCH_THRESHOLD: float = 75.0
    INCOME_DISCREPANCY_TOLERANCE_PERCENT: float = 5.0

    CORS_ORIGINS: Union[str, List[str]] = []

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v or []

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value:
            raise ValueError("DATABASE_URL must be configured; no implicit SQLite fallback is permitted")
        return value

    @field_validator("OCR_MODE")
    @classmethod
    def validate_ocr_mode(cls, value: str) -> str:
        value = value.lower().strip()
        if value not in {"real", "demo"}:
            raise ValueError("OCR_MODE must be either 'real' or 'demo'")
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
