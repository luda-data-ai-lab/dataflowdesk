"""`upload_history` table — one row per Excel upload (SPEC §2.2)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UploadHistory(Base):
    """Audit record for a single Excel upload."""

    __tablename__ = "upload_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sheet: Mapped[str] = mapped_column(String(20), nullable=False, server_default="interfaces")
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    record_count: Mapped[int | None] = mapped_column(Integer)
    skipped_count: Mapped[int | None] = mapped_column(Integer)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="Success")
