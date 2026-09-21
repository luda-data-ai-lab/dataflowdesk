"""`branding` table — single-row customer branding (company name + logo).

The logo is stored as bytes in the database so the setting survives container
restarts and works identically on SQLite / PostgreSQL / MSSQL without a shared
filesystem.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

BRANDING_ROW_ID = 1


class Branding(Base):
    """Customer-specific branding shown in the app header/sidebar."""

    __tablename__ = "branding"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=BRANDING_ROW_ID)
    company_name: Mapped[str | None] = mapped_column(String(100))
    tagline: Mapped[str | None] = mapped_column(String(200))
    logo_mime: Mapped[str | None] = mapped_column(String(50))
    logo_data: Mapped[bytes | None] = mapped_column(LargeBinary)
    logo_size: Mapped[int | None] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
