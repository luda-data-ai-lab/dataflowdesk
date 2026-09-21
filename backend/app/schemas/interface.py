"""Schemas for the Interfaces API (SPEC §4.2)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.constants import DEFAULT_INTERFACE_STATUS


class InterfaceBase(BaseModel):
    """Fields shared by create / update payloads."""

    interface_id: str = Field(max_length=50, min_length=1)
    interface_name: str = Field(max_length=200, min_length=1)
    integration_type: str = Field(max_length=50, min_length=1)
    process: str | None = None
    source_system_id: int
    target_system_id: int
    via_system_id: int | None = Field(
        default=None, description="Intermediate hub (e.g. IFSYS/EAI); null for direct links"
    )
    cycle: str = Field(max_length=20, min_length=1)
    description: str | None = None
    status: str = Field(default=DEFAULT_INTERFACE_STATUS, max_length=20)


class InterfaceCreate(InterfaceBase):
    """Create payload."""


class InterfaceUpdate(InterfaceBase):
    """Update payload (full replace)."""


class SystemRef(BaseModel):
    """Minimal embedded system reference."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    system_code: str
    system_name: str
    type: str


class InterfaceOut(InterfaceBase):
    """Response body with embedded source / target systems."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    source_system: SystemRef | None = None
    target_system: SystemRef | None = None
    via_system: SystemRef | None = None
    created_at: datetime
    updated_at: datetime
