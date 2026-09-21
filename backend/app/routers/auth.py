"""Auth endpoints: login / refresh / me (SPEC §4.6)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenPair
from app.schemas.user import UserOut
from app.services import auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _pair(user: User) -> TokenPair:
    return TokenPair(
        access_token=auth.create_token(user, "access"),
        refresh_token=auth.create_token(user, "refresh"),
    )


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    """Exchange credentials for an access + refresh token pair."""
    user = (
        await db.execute(select(User).where(User.username == payload.username))
    ).scalar_one_or_none()
    if user is None or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."
        )
    if not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "비활성화된 계정입니다.")
    return _pair(user)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    """Issue a new token pair from a valid refresh token."""
    user = await auth.load_active_user(db, auth.decode_token(payload.refresh_token, "refresh"))
    return _pair(user)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(auth.get_current_user)) -> User:
    """Current user info."""
    return user
