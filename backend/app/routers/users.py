"""User management endpoints, admin only (SPEC §4.7)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services import auth

router = APIRouter(prefix="/api/users", tags=["users"], dependencies=[Depends(auth.require_admin)])


async def _get_or_404(db: AsyncSession, user_id: int) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "사용자를 찾을 수 없습니다.")
    return user


@router.get("", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)) -> list[User]:
    """All accounts, oldest first."""
    return list((await db.execute(select(User).order_by(User.id))).scalars().all())


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> User:
    """Create an account."""
    exists = await db.execute(select(User.id).where(User.username == payload.username))
    if exists.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 사용 중인 아이디입니다.")
    user = User(
        username=payload.username,
        password_hash=auth.hash_password(payload.password),
        display_name=payload.display_name,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(auth.require_admin),
) -> User:
    """Update display name / role and optionally reset the password."""
    user = await _get_or_404(db, user_id)
    if user.id == admin.id and payload.role != "admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "자신의 관리자 권한은 해제할 수 없습니다.")
    user.display_name = payload.display_name
    user.role = payload.role
    if payload.password:
        user.password_hash = auth.hash_password(payload.password)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/deactivate", response_model=UserOut)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(auth.require_admin),
) -> User:
    """Deactivate an account (login and token use are rejected afterwards)."""
    user = await _get_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "자신의 계정은 비활성화할 수 없습니다.")
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/activate", response_model=UserOut)
async def activate_user(user_id: int, db: AsyncSession = Depends(get_db)) -> User:
    """Re-activate a deactivated account."""
    user = await _get_or_404(db, user_id)
    user.is_active = True
    await db.commit()
    await db.refresh(user)
    return user
