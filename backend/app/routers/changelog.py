"""Change log (audit trail) endpoints: filtered list + Excel export (SPEC §4.5)."""

from __future__ import annotations

import json
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.database import get_db
from app.models import ChangeLog, Interface, System, User
from app.schemas.changelog import ChangeLogOut
from app.schemas.common import Page
from app.services import excel_parser
from app.services.xlsx import xlsx_response

router = APIRouter(prefix="/api/changelog", tags=["changelog"])

CHANGELOG_SHEET = "변경 이력"
CHANGELOG_COLUMNS: tuple[str, ...] = (
    "변경일시",
    "대상",
    "레코드",
    "작업",
    "필드",
    "이전 값",
    "변경 값",
    "사용자",
)
TABLE_LABELS = {"systems": "시스템", "interfaces": "인터페이스"}
LABEL_KEYS = {"systems": "system_code", "interfaces": "interface_id"}

Row = tuple[ChangeLog, str | None, str | None, str | None]


def _filtered(
    table: str | None,
    action: str | None,
    user_id: int | None,
    record_id: int | None,
    date_from: date | None,
    date_to: date | None,
) -> Select[Row]:
    """Newest-first change log joined with the acting user and the current record label."""
    deleted = aliased(ChangeLog)
    delete_snapshot = (
        select(deleted.old_value)
        .where(
            deleted.table_name == ChangeLog.table_name,
            deleted.record_id == ChangeLog.record_id,
            deleted.action == "DELETE",
        )
        .order_by(deleted.id.desc())
        .limit(1)
        .correlate(ChangeLog)
        .scalar_subquery()
    )
    stmt = (
        select(
            ChangeLog, User.username, System.system_code, Interface.interface_id, delete_snapshot
        )
        .outerjoin(User, User.id == ChangeLog.user_id)
        .outerjoin(System, (ChangeLog.table_name == "systems") & (System.id == ChangeLog.record_id))
        .outerjoin(
            Interface,
            (ChangeLog.table_name == "interfaces") & (Interface.id == ChangeLog.record_id),
        )
        .order_by(ChangeLog.changed_at.desc(), ChangeLog.id.desc())
    )
    if table:
        stmt = stmt.where(ChangeLog.table_name == table)
    if action:
        stmt = stmt.where(ChangeLog.action == action.upper())
    if user_id is not None:
        stmt = stmt.where(ChangeLog.user_id == user_id)
    if record_id is not None:
        stmt = stmt.where(ChangeLog.record_id == record_id)
    if date_from:
        stmt = stmt.where(ChangeLog.changed_at >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(
            ChangeLog.changed_at < datetime.combine(date_to + timedelta(days=1), time.min)
        )
    return stmt


def _label(
    log: ChangeLog,
    system_code: str | None,
    interface_id: str | None,
    delete_snapshot: str | None,
) -> str | None:
    """Current key of the record; for deleted records, the key from the last DELETE snapshot."""
    current = system_code if log.table_name == "systems" else interface_id
    if current:
        return current
    snapshot = delete_snapshot or (log.new_value if log.field_name is None else None)
    if snapshot:
        try:
            value = json.loads(snapshot).get(LABEL_KEYS.get(log.table_name, ""))
        except ValueError:
            return None
        return str(value) if value is not None else None
    return None


def _to_out(row: Row) -> ChangeLogOut:
    log, username, system_code, interface_id, delete_snapshot = row
    return ChangeLogOut(
        id=log.id,
        table_name=log.table_name,
        record_id=log.record_id,
        record_label=_label(log, system_code, interface_id, delete_snapshot),
        action=log.action,
        field_name=log.field_name,
        old_value=log.old_value,
        new_value=log.new_value,
        changed_at=log.changed_at,
        user_id=log.user_id,
        username=username,
    )


@router.get("", response_model=Page[ChangeLogOut])
async def list_changelog(
    table: str | None = Query(None, pattern="^(systems|interfaces)$"),
    action: str | None = Query(None, pattern="^(?i:create|update|delete)$"),
    user_id: int | None = None,
    record_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: AsyncSession = Depends(get_db),
) -> Page[ChangeLogOut]:
    """Paginated audit rows, newest first."""
    stmt = _filtered(table, action, user_id, record_id, date_from, date_to)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset((page - 1) * size).limit(size))).all()
    return Page(items=[_to_out(tuple(r)) for r in rows], total=total, page=page, size=size)


@router.get("/export")
async def export_changelog(
    table: str | None = Query(None, pattern="^(systems|interfaces)$"),
    action: str | None = Query(None, pattern="^(?i:create|update|delete)$"),
    user_id: int | None = None,
    record_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Download the filtered audit rows (all pages) as a single-sheet xlsx."""
    stmt = _filtered(table, action, user_id, record_id, date_from, date_to)
    rows = []
    for r in (await db.execute(stmt)).all():
        out = _to_out(tuple(r))
        rows.append(
            [
                out.changed_at.strftime("%Y-%m-%d %H:%M:%S"),
                TABLE_LABELS.get(out.table_name, out.table_name),
                out.record_label or f"#{out.record_id}",
                out.action,
                out.field_name,
                out.old_value,
                out.new_value,
                out.username,
            ]
        )
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return xlsx_response(
        excel_parser.build_sheet(CHANGELOG_SHEET, list(CHANGELOG_COLUMNS), rows),
        f"dataflowdesk_changelog_{stamp}.xlsx",
    )
