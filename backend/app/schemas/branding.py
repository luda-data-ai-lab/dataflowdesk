"""Pydantic schemas for customer branding settings."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BrandingUpdate(BaseModel):
    """Editable text fields; the logo is uploaded separately as multipart."""

    company_name: str | None = Field(default=None, max_length=100)
    tagline: str | None = Field(default=None, max_length=200)


class BrandingOut(BaseModel):
    """Branding as consumed by the frontend. `logo_url` is null when no logo is set."""

    model_config = ConfigDict(from_attributes=True)

    company_name: str | None
    tagline: str | None
    logo_url: str | None
    logo_mime: str | None
    logo_size: int | None
    updated_at: datetime
