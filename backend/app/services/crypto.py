"""Symmetric encryption for system connection passwords (see QUESTIONS.md Q1)."""

from __future__ import annotations

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


@lru_cache
def _fernet() -> Fernet:
    """Build the Fernet instance from `SYSTEM_PASSWORD_KEY` (or a `JWT_SECRET` derived dev key)."""
    settings = get_settings()
    key = settings.system_password_key.strip()
    if not key:
        digest = hashlib.sha256(settings.jwt_secret.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest).decode("ascii")
    return Fernet(key.encode("ascii"))


def encrypt(plain: str | None) -> str | None:
    """Encrypt a plaintext password; `None`/empty stays `None`."""
    if not plain:
        return None
    return _fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt(token: str | None) -> str | None:
    """Decrypt a stored password; returns `None` if empty or undecryptable."""
    if not token:
        return None
    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError):
        return None
