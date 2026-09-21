"""Schemas for the Users API (SPEC §4.7)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["admin", "user"]


class UserCreate(BaseModel):
    """Admin creates an account with an initial password."""

    username: str = Field(min_length=1, max_length=50, pattern=r"^[A-Za-z0-9._-]+$")
    password: str = Field(min_length=4, max_length=128)
    display_name: str | None = Field(default=None, max_length=100)
    role: Role = "user"


class UserUpdate(BaseModel):
    """Admin edits profile / role; `password` resets it when given."""

    display_name: str | None = Field(default=None, max_length=100)
    role: Role
    password: str | None = Field(default=None, min_length=4, max_length=128)


class UserOut(BaseModel):
    """Public view of an account (never includes the hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str | None
    role: str
    is_active: bool
    created_at: datetime
