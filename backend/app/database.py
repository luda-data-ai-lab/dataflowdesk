"""SQLAlchemy async engine / session factory and the FastAPI session dependency."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""


def _build_engine():
    """Create the async engine for the configured backend.

    SQLite uses the `aiosqlite` driver (thread-pool wrapped sync driver) so the whole
    application can stay async regardless of `DB_TYPE`.
    """
    settings = get_settings()
    url = settings.sqlalchemy_url
    kwargs: dict[str, object] = {"echo": False, "future": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_pre_ping"] = True
    return create_async_engine(url, **kwargs)


engine = _build_engine()
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncIterator[AsyncSession]:
    """Yield a request-scoped `AsyncSession`."""
    async with SessionLocal() as session:
        yield session
