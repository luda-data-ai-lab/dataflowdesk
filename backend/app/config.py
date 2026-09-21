"""Application settings loaded from environment variables / `.env`.

All secrets and environment-specific values live here (DEVIN.md Part C rule 4).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Typed view over the `.env` file (see `.env.example` for documentation)."""

    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", REPO_ROOT / "backend" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    db_type: Literal["sqlite", "postgresql", "mssql"] = "sqlite"
    sqlite_path: str = "./data/ifmanager.db"
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "ifmanager"
    db_user: str = "ifmanager"
    db_password: str = ""
    mssql_odbc_driver: str = "ODBC Driver 18 for SQL Server"
    database_url: str | None = None

    system_password_key: str = ""
    jwt_secret: str = "change-me"
    jwt_access_token_minutes: int = 30
    jwt_refresh_token_days: int = 7

    backend_port: int = 8000
    cors_origins: str = "http://localhost:5173"

    @property
    def sqlalchemy_url(self) -> str:
        """Build the async SQLAlchemy URL for the configured `DB_TYPE`."""
        if self.database_url:
            return self.database_url
        if self.db_type == "sqlite":
            path = Path(self.sqlite_path)
            if not path.is_absolute():
                path = REPO_ROOT / path
            path.parent.mkdir(parents=True, exist_ok=True)
            return f"sqlite+aiosqlite:///{path}"
        user = quote_plus(self.db_user)
        password = quote_plus(self.db_password)
        if self.db_type == "postgresql":
            return (
                f"postgresql+asyncpg://{user}:{password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}"
            )
        driver = quote_plus(self.mssql_odbc_driver)
        return (
            f"mssql+aioodbc://{user}:{password}@{self.db_host}:{self.db_port}/{self.db_name}"
            f"?driver={driver}&TrustServerCertificate=yes"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        """Comma separated `CORS_ORIGINS` as a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings singleton."""
    return Settings()
