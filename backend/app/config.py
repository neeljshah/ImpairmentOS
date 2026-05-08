from functools import lru_cache
from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite:///./impairmentos.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    psi_pass_threshold: float = 10.0
    default_timezone: str = "America/New_York"
    app_title: str = "ImpairmentOS API"
    app_version: str = "1.0.0"


@lru_cache
def get_settings() -> Settings:
    return Settings()
