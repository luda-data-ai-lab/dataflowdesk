"""Interfaces CRUD endpoints (SPEC §4.2)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.database import get_db
from app.models import Interface, System
from app.schemas.common import Page
from app.schemas.interface import InterfaceCreate, InterfaceOut, InterfaceUpdate

router = APIRouter(prefix="/api/interfaces", tags=["interfaces"])

SORTABLE = {
    "id": Interface.id,
    "interface_id": Interface.interface_id,
    "interface_name": Interface.interface_name,
    "integration_type": Interface.integration_type,
    "cycle": Interface.cycle,
    "status": Interface.status,
    "updated_at": Interface.updated_at,
}


async def _get_or_404(db: AsyncSession, interface_pk: int) -> Interface:
    """Fetch an interface by primary key or raise 404."""
    interface = await db.get(Interface, interface_pk)
    if interface is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Interface not found")
    return interface


async def _validate_systems(
    db: AsyncSession, source_id: int, target_id: int, via_id: int | None = None
) -> None:
    """Raise 400 if source, target or via system does not exist."""
    wanted = {"source_system_id": source_id, "target_system_id": target_id}
    if via_id is not None:
        wanted["via_system_id"] = via_id
    rows = (
        (await db.execute(select(System.id).where(System.id.in_(list(wanted.values())))))
        .scalars()
        .all()
    )
    found = set(rows)
    missing = [name for name, sid in wanted.items() if sid not in found]
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail=f"Unknown system for {', '.join(missing)}"
        )


async def _ensure_unique_interface_id(
    db: AsyncSession, interface_id: str, exclude_pk: int | None = None
) -> None:
    """Raise 409 if `interface_id` is already used by another record."""
    stmt = select(Interface.id).where(Interface.interface_id == interface_id)
    if exclude_pk is not None:
        stmt = stmt.where(Interface.id != exclude_pk)
    if (await db.execute(stmt)).first():
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=f"interface_id '{interface_id}' already exists"
        )


@router.get("", response_model=Page[InterfaceOut])
async def list_interfaces(
    integration_type: str | None = None,
    source: str | None = Query(None, description="source system_code"),
    target: str | None = Query(None, description="target system_code"),
    system: str | None = Query(None, description="system_code as source OR target OR via"),
    via: str | None = Query(None, description="via (hub) system_code"),
    cycle: str | None = None,
    status_: str | None = Query(None, alias="status"),
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    sort: str = Query("interface_id"),
    db: AsyncSession = Depends(get_db),
) -> Page[InterfaceOut]:
    """List interfaces with filters, keyword search (name/description/process) and paging."""
    src = aliased(System)
    tgt = aliased(System)
    hub = aliased(System)
    stmt = (
        select(Interface)
        .outerjoin(src, Interface.source_system_id == src.id)
        .outerjoin(tgt, Interface.target_system_id == tgt.id)
        .outerjoin(hub, Interface.via_system_id == hub.id)
    )
    if integration_type:
        stmt = stmt.where(Interface.integration_type == integration_type)
    if source:
        stmt = stmt.where(src.system_code == source)
    if target:
        stmt = stmt.where(tgt.system_code == target)
    if via:
        stmt = stmt.where(hub.system_code == via)
    if system:
        stmt = stmt.where(
            or_(src.system_code == system, tgt.system_code == system, hub.system_code == system)
        )
    if cycle:
        stmt = stmt.where(Interface.cycle == cycle)
    if status_:
        stmt = stmt.where(Interface.status == status_)
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(
            or_(
                Interface.interface_id.ilike(like),
                Interface.interface_name.ilike(like),
                Interface.description.ilike(like),
                Interface.process.ilike(like),
            )
        )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    key = sort.lstrip("-")
    if key not in SORTABLE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Cannot sort by '{key}'")
    col = SORTABLE[key]
    stmt = stmt.order_by(col.desc() if sort.startswith("-") else col.asc(), Interface.id)
    stmt = stmt.offset((page - 1) * size).limit(size)
    items = (await db.execute(stmt)).unique().scalars().all()
    return Page(
        items=[InterfaceOut.model_validate(i) for i in items], total=total, page=page, size=size
    )


@router.get("/{interface_pk}", response_model=InterfaceOut)
async def get_interface(interface_pk: int, db: AsyncSession = Depends(get_db)) -> InterfaceOut:
    """Interface detail."""
    return InterfaceOut.model_validate(await _get_or_404(db, interface_pk))


@router.post("", response_model=InterfaceOut, status_code=status.HTTP_201_CREATED)
async def create_interface(
    payload: InterfaceCreate, db: AsyncSession = Depends(get_db)
) -> InterfaceOut:
    """Create an interface after validating uniqueness and system FKs."""
    await _ensure_unique_interface_id(db, payload.interface_id)
    await _validate_systems(
        db, payload.source_system_id, payload.target_system_id, payload.via_system_id
    )
    interface = Interface(**payload.model_dump())
    db.add(interface)
    await db.commit()
    await db.refresh(interface)
    return InterfaceOut.model_validate(await _get_or_404(db, interface.id))


@router.put("/{interface_pk}", response_model=InterfaceOut)
async def update_interface(
    interface_pk: int, payload: InterfaceUpdate, db: AsyncSession = Depends(get_db)
) -> InterfaceOut:
    """Full update of an interface."""
    interface = await _get_or_404(db, interface_pk)
    await _ensure_unique_interface_id(db, payload.interface_id, exclude_pk=interface_pk)
    await _validate_systems(
        db, payload.source_system_id, payload.target_system_id, payload.via_system_id
    )
    for key, value in payload.model_dump().items():
        setattr(interface, key, value)
    await db.commit()
    db.expire(interface)
    return InterfaceOut.model_validate(await _get_or_404(db, interface_pk))


@router.delete("/{interface_pk}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_interface(interface_pk: int, db: AsyncSession = Depends(get_db)) -> None:
    """Delete an interface."""
    interface = await _get_or_404(db, interface_pk)
    await db.delete(interface)
    await db.commit()
