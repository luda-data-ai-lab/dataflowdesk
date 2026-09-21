"""Dashboard API: summary cards and chart aggregations (SPEC §4.4)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.constants import REALTIME_CYCLE
from app.database import get_db
from app.models import ChangeLog, Interface, System
from app.schemas.dashboard import DashboardSummary, LabelCount, SystemCount

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

RECENT_DAYS = 7


@router.get("/summary", response_model=DashboardSummary)
async def summary(db: AsyncSession = Depends(get_db)) -> DashboardSummary:
    """Totals for the four stat cards."""
    total_if, active_if, realtime_if = (
        await db.execute(
            select(
                func.count(Interface.id),
                func.coalesce(func.sum(case((Interface.status == "Active", 1), else_=0)), 0),
                func.coalesce(func.sum(case((Interface.cycle == REALTIME_CYCLE, 1), else_=0)), 0),
            )
        )
    ).one()
    total_sys = (await db.execute(select(func.count(System.id)))).scalar_one()
    since = datetime.now(timezone.utc) - timedelta(days=RECENT_DAYS)
    recent = (
        await db.execute(select(func.count(ChangeLog.id)).where(ChangeLog.changed_at >= since))
    ).scalar_one()
    ratio = round(realtime_if * 100 / total_if, 1) if total_if else 0.0
    return DashboardSummary(
        total_interfaces=total_if,
        total_systems=total_sys,
        active_interfaces=active_if,
        realtime_ratio=ratio,
        recent_changes=recent,
    )


@router.get("/by-system", response_model=list[SystemCount])
async def by_system(db: AsyncSession = Depends(get_db)) -> list[SystemCount]:
    """Interface count per system as source and as target, busiest first."""
    src = (
        select(Interface.source_system_id.label("sid"), func.count().label("n"))
        .group_by(Interface.source_system_id)
        .subquery()
    )
    tgt = (
        select(Interface.target_system_id.label("sid"), func.count().label("n"))
        .group_by(Interface.target_system_id)
        .subquery()
    )
    rows = (
        await db.execute(
            select(
                System,
                func.coalesce(src.c.n, 0),
                func.coalesce(tgt.c.n, 0),
            )
            .outerjoin(src, src.c.sid == System.id)
            .outerjoin(tgt, tgt.c.sid == System.id)
            .order_by(System.system_code)
        )
    ).all()
    result = [
        SystemCount(
            system_id=s.id,
            system_code=s.system_code,
            system_name=s.system_name,
            type=s.type,
            source_count=sc,
            target_count=tc,
            total=sc + tc,
        )
        for s, sc, tc in rows
    ]
    result.sort(key=lambda r: (-r.total, r.system_code))
    return result


async def _group(db: AsyncSession, column: InstrumentedAttribute[str]) -> list[LabelCount]:
    rows = (
        await db.execute(
            select(column, func.count()).group_by(column).order_by(func.count().desc(), column)
        )
    ).all()
    return [LabelCount(label=label or "(미지정)", count=n) for label, n in rows]


@router.get("/by-type", response_model=list[LabelCount])
async def by_type(db: AsyncSession = Depends(get_db)) -> list[LabelCount]:
    """Distribution of `integration_type` (연동방식)."""
    return await _group(db, Interface.integration_type)


@router.get("/by-cycle", response_model=list[LabelCount])
async def by_cycle(db: AsyncSession = Depends(get_db)) -> list[LabelCount]:
    """Distribution of `cycle` (연동주기)."""
    return await _group(db, Interface.cycle)
