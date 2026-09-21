"""`interfaces` table — one row per system-to-system interface (SPEC §2.1)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.system import System


class Interface(Base):
    """An interface definition linking a source and a target system."""

    __tablename__ = "interfaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    interface_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    interface_name: Mapped[str] = mapped_column(String(200), nullable=False)
    integration_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    process: Mapped[str | None] = mapped_column(Text)
    source_system_id: Mapped[int | None] = mapped_column(ForeignKey("systems.id"), index=True)
    target_system_id: Mapped[int | None] = mapped_column(ForeignKey("systems.id"), index=True)
    via_system_id: Mapped[int | None] = mapped_column(ForeignKey("systems.id"), index=True)
    cycle: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="Active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    source_system: Mapped[System | None] = relationship(
        System, foreign_keys=[source_system_id], back_populates="source_interfaces", lazy="joined"
    )
    target_system: Mapped[System | None] = relationship(
        System, foreign_keys=[target_system_id], back_populates="target_interfaces", lazy="joined"
    )
    via_system: Mapped[System | None] = relationship(
        System, foreign_keys=[via_system_id], back_populates="via_interfaces", lazy="joined"
    )
