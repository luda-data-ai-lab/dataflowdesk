"""Schemas for the Upload / Export API (SPEC §4.3)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RowError(BaseModel):
    """Validation failure for one Excel row."""

    row: int
    field: str
    reason: str


class UploadResult(BaseModel):
    """Result report returned after an upload."""

    file_name: str
    sheet: str
    success_count: int
    skipped_count: int
    errors: list[RowError]


class UploadHistoryOut(BaseModel):
    """One upload history record."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    sheet: str
    uploaded_at: datetime
    record_count: int | None
    skipped_count: int | None
    user_id: int | None
    status: str
