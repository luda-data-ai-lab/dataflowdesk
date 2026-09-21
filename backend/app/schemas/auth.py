"""Schemas for the Auth API (SPEC §4.6)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Username / password credentials."""

    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1)


class TokenPair(BaseModel):
    """Access + refresh tokens returned by login / refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Body of `POST /api/auth/refresh`."""

    refresh_token: str
