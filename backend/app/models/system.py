"""`systems` table — connection information for each registered system (SPEC §2.3)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class System(Base):
    """A source/target system such as SAP, CRM or HR."""

    __tablename__ = "systems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    system_name: Mapped[str] = mapped_column(String(100), nullable=False)
    system_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    ip: Mapped[str | None] = mapped_column(String(50))
    port: Mapped[int | None] = mapped_column(Integer)
    account: Mapped[str | None] = mapped_column(String(100))
    password_encrypted: Mapped[str | None] = mapped_column(Text)
    product_name: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    source_interfaces: Mapped[list["Interface"]] = relationship(  # noqa: F821
        "Interface", foreign_keys="Interface.source_system_id", back_populates="source_system"
    )
    target_interfaces: Mapped[list["Interface"]] = relationship(  # noqa: F821
        "Interface", foreign_keys="Interface.target_system_id", back_populates="target_system"
    )
    via_interfaces: Mapped[list["Interface"]] = relationship(  # noqa: F821
        "Interface", foreign_keys="Interface.via_system_id", back_populates="via_system"
    )
