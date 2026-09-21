"""`change_log` table — field-level audit trail (SPEC §2.5). Populated from Phase 3."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ChangeLog(Base):
    """One CREATE / UPDATE / DELETE event for a single field of a record."""

    __tablename__ = "change_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    table_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    record_id: Mapped[int] = mapped_column(Integer, nullable=False)
    field_name: Mapped[str | None] = mapped_column(String(100))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    action: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
