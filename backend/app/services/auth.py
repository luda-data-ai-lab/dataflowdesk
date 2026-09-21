"""Password hashing, JWT issuing / verification and the auth dependencies (SPEC §2.6)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import User
from app.services.audit import current_user_id

ALGORITHM = "HS256"
TokenType = Literal["access", "refresh"]

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    """bcrypt hash for storage in `users.password_hash`."""
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time check of `plain` against a stored hash."""
    return _pwd.verify(plain, hashed)


def create_token(user: User, kind: TokenType) -> str:
    """Sign a JWT of the given kind for `user`."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    ttl = (
        timedelta(minutes=settings.jwt_access_token_minutes)
        if kind == "access"
        else timedelta(days=settings.jwt_refresh_token_days)
    )
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "type": kind,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str, kind: TokenType) -> int:
    """Return the user id encoded in a valid token of the given kind, else raise 401."""
    try:
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise _unauthorized("유효하지 않은 토큰입니다.") from exc
    if payload.get("type") != kind:
        raise _unauthorized("토큰 종류가 올바르지 않습니다.")
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise _unauthorized("유효하지 않은 토큰입니다.") from exc


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def load_active_user(db: AsyncSession, user_id: int) -> User:
    """Fetch a user by id, rejecting missing / deactivated accounts with 401."""
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized("비활성화되었거나 존재하지 않는 사용자입니다.")
    return user


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the bearer access token to an active `User` and tag the request for auditing."""
    if credentials is None:
        raise _unauthorized("로그인이 필요합니다.")
    user = await load_active_user(db, decode_token(credentials.credentials, "access"))
    current_user_id.set(user.id)
    request.state.user = user
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency for admin-only endpoints (SPEC §4.7)."""
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "관리자만 사용할 수 있습니다.")
    return user
