"""Schemas for the Systems API (SPEC §4.1)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SystemBase(BaseModel):
    """Fields shared by create / update payloads."""

    category: str = Field(max_length=20)
    type: str = Field(max_length=20)
    system_name: str = Field(max_length=100)
    system_code: str = Field(max_length=50, min_length=1)
    ip: str | None = Field(default=None, max_length=50)
    port: int | None = Field(default=None, ge=0, le=65535)
    account: str | None = Field(default=None, max_length=100)
    product_name: str | None = Field(default=None, max_length=100)
    description: str | None = None


class SystemCreate(SystemBase):
    """Create payload; `password` is plaintext and encrypted on save."""

    password: str | None = None


class SystemUpdate(SystemBase):
    """Update payload; omit `password` (None) to keep the stored one."""

    password: str | None = None


class SystemOut(SystemBase):
    """Response body. `password` is masked unless explicitly requested."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    password: str | None = None
    has_password: bool = False
    interface_count: int = 0
    created_at: datetime
    updated_at: datetime
