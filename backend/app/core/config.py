from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "EnviroQuant API"
    environment: str = "local"
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(..., min_length=1)
    secret_key: str = Field(default="change-this-before-deployment", min_length=16)
    access_token_expire_minutes: int = 480
    allowed_origins: list[str] = ["http://localhost:3000"]
    frontend_app_url: str = "http://localhost:3000"
    platform_admin_emails: list[str] = []
    email_user: str | None = None
    email_pass: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_folder: str = "enviroquant"
    max_upload_size_mb: int = 50
    openai_api_key: str | None = None
    openai_evaluation_model: str = "gpt-4.1-mini"
    openai_evaluation_timeout_seconds: int = 90
    openai_evaluation_max_concurrency: int = 6


@lru_cache
def get_settings() -> Settings:
    return Settings()
