"""Schemas for the Change Log API (SPEC §4.5)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChangeLogOut(BaseModel):
    """One audit row plus the acting user's display name."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    table_name: str
    record_id: int
    record_label: str | None
    action: str
    field_name: str | None
    old_value: str | None
    new_value: str | None
    changed_at: datetime
    user_id: int | None
    username: str | None
