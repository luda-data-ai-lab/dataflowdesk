"""Systems CRUD endpoints (SPEC §4.1)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PASSWORD_MASK
from app.database import get_db
from app.models import Interface, System
from app.schemas.common import Page
from app.schemas.system import SystemCreate, SystemOut, SystemUpdate
from app.services import crypto

router = APIRouter(prefix="/api/systems", tags=["systems"])


async def _interface_counts(db: AsyncSession, system_ids: list[int]) -> dict[int, int]:
    """Return {system_id: number of interfaces referencing it as source or target}."""
    if not system_ids:
        return {}
    counts: dict[int, int] = {sid: 0 for sid in system_ids}
    for column in (
        Interface.source_system_id,
        Interface.target_system_id,
        Interface.via_system_id,
    ):
        stmt = (
            select(column, func.count(Interface.id)).where(column.in_(system_ids)).group_by(column)
        )
        for sid, cnt in (await db.execute(stmt)).all():
            counts[sid] = counts.get(sid, 0) + cnt
    return counts


def _to_out(system: System, interface_count: int, include_password: bool) -> SystemOut:
    """Serialize a `System`, masking the password unless `include_password` is set."""
    has_password = bool(system.password_encrypted)
    password: str | None = None
    if has_password:
        password = crypto.decrypt(system.password_encrypted) if include_password else PASSWORD_MASK
    return SystemOut(
        id=system.id,
        category=system.category,
        type=system.type,
        system_name=system.system_name,
        system_code=system.system_code,
        ip=system.ip,
        port=system.port,
        account=system.account,
        product_name=system.product_name,
        description=system.description,
        password=password,
        has_password=has_password,
        interface_count=interface_count,
        created_at=system.created_at,
        updated_at=system.updated_at,
    )


async def _get_or_404(db: AsyncSession, system_id: int) -> System:
    """Fetch a system by id or raise 404."""
    system = await db.get(System, system_id)
    if system is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="System not found")
    return system


async def _ensure_unique_code(db: AsyncSession, code: str, exclude_id: int | None = None) -> None:
    """Raise 409 if another system already uses `code`."""
    stmt = select(System.id).where(System.system_code == code)
    if exclude_id is not None:
        stmt = stmt.where(System.id != exclude_id)
    if (await db.execute(stmt)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"system_code '{code}' already exists")


@router.get("", response_model=Page[SystemOut])
async def list_systems(
    category: str | None = None,
    type: str | None = None,
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    sort: str = Query("id", pattern="^-?(id|category|type|system_name|system_code|updated_at)$"),
    db: AsyncSession = Depends(get_db),
) -> Page[SystemOut]:
    """List systems with optional category / type / keyword filters. Passwords are masked."""
    stmt = select(System)
    if category:
        stmt = stmt.where(System.category == category)
    if type:
        stmt = stmt.where(System.type == type)
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(
            or_(
                System.system_name.ilike(like),
                System.system_code.ilike(like),
                System.description.ilike(like),
                System.ip.ilike(like),
                System.product_name.ilike(like),
            )
        )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    order_col = getattr(System, sort.lstrip("-"))
    stmt = stmt.order_by(order_col.desc() if sort.startswith("-") else order_col.asc())
    stmt = stmt.offset((page - 1) * size).limit(size)
    systems = list((await db.execute(stmt)).scalars().all())
    counts = await _interface_counts(db, [s.id for s in systems])
    return Page(
        items=[_to_out(s, counts.get(s.id, 0), include_password=False) for s in systems],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{system_id}", response_model=SystemOut)
async def get_system(
    system_id: int,
    include_password: bool = False,
    db: AsyncSession = Depends(get_db),
) -> SystemOut:
    """System detail. `include_password=true` returns the decrypted password.

    TODO(phase3): restrict `include_password` to the admin role.
    """
    system = await _get_or_404(db, system_id)
    counts = await _interface_counts(db, [system.id])
    return _to_out(system, counts.get(system.id, 0), include_password=include_password)


@router.post("", response_model=SystemOut, status_code=status.HTTP_201_CREATED)
async def create_system(payload: SystemCreate, db: AsyncSession = Depends(get_db)) -> SystemOut:
    """Create a system; `system_code` must be unique."""
    await _ensure_unique_code(db, payload.system_code)
    data = payload.model_dump(exclude={"password"})
    system = System(**data, password_encrypted=crypto.encrypt(payload.password))
    db.add(system)
    await db.commit()
    await db.refresh(system)
    return _to_out(system, 0, include_password=False)


@router.put("/{system_id}", response_model=SystemOut)
async def update_system(
    system_id: int, payload: SystemUpdate, db: AsyncSession = Depends(get_db)
) -> SystemOut:
    """Update a system. A `None` password keeps the existing one; empty string clears it."""
    system = await _get_or_404(db, system_id)
    await _ensure_unique_code(db, payload.system_code, exclude_id=system_id)
    for key, value in payload.model_dump(exclude={"password"}).items():
        setattr(system, key, value)
    if payload.password is not None:
        system.password_encrypted = crypto.encrypt(payload.password)
    await db.commit()
    await db.refresh(system)
    counts = await _interface_counts(db, [system.id])
    return _to_out(system, counts.get(system.id, 0), include_password=False)


@router.delete("/{system_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_system(system_id: int, db: AsyncSession = Depends(get_db)) -> None:
    """Delete a system unless any interface references it (409)."""
    system = await _get_or_404(db, system_id)
    counts = await _interface_counts(db, [system.id])
    if counts.get(system.id, 0) > 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"System is referenced by {counts[system.id]} interface(s) and cannot be deleted",
        )
    await db.delete(system)
    await db.commit()
