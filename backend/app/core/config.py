from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "EnviroQuant API"
    environment: str = "local"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://enviroquant:enviroquant@localhost:5432/enviroquant"
    secret_key: str = Field(default="change-this-before-deployment", min_length=16)
    access_token_expire_minutes: int = 480
    allowed_origins: list[str] = ["http://localhost:3000"]
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_folder: str = "enviroquant"
    max_upload_size_mb: int = 50


@lru_cache
def get_settings() -> Settings:
    return Settings()
