"""Automatic `change_log` recording for `System` / `Interface` (SPEC §2.5).

Session-level flush listeners collect pending CREATE / UPDATE / DELETE events and append
`ChangeLog` rows in the same transaction. The acting user is taken from `current_user_id`,
a ContextVar set by the auth dependency for each request.
"""

from __future__ import annotations

import json
from contextvars import ContextVar
from datetime import date, datetime
from typing import Any

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session, UOWTransaction

from app.models import ChangeLog, Interface, System

current_user_id: ContextVar[int | None] = ContextVar("current_user_id", default=None)

AUDITED = (System, Interface)
SKIP_FIELDS = {"id", "created_at", "updated_at"}
MASKED_FIELDS = {"password_encrypted"}
MASK = "***"
_PENDING = "pending_change_logs"


def _scalar(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _stringify(value: Any) -> str | None:
    if value is None:
        return None
    return str(_scalar(value))


def _snapshot(instance: System | Interface) -> str:
    """JSON of the audited columns (passwords masked) for CREATE / DELETE rows."""
    data: dict[str, Any] = {}
    state = inspect(instance)
    for col in state.mapper.column_attrs:
        if col.key in SKIP_FIELDS:
            continue
        value = state.attrs[col.key].value
        if col.key in MASKED_FIELDS:
            value = MASK if value else None
        data[col.key] = _scalar(value)
    return json.dumps(data, ensure_ascii=False)


def _entries(session: Session) -> list[ChangeLog]:
    user_id = current_user_id.get()
    rows: list[ChangeLog] = []

    for obj in session.new:
        if isinstance(obj, AUDITED):
            rows.append(
                ChangeLog(
                    table_name=obj.__tablename__,
                    record_id=obj.id,
                    action="CREATE",
                    field_name=None,
                    old_value=None,
                    new_value=_snapshot(obj),
                    user_id=user_id,
                )
            )

    for obj in session.dirty:
        if not isinstance(obj, AUDITED) or not session.is_modified(obj):
            continue
        state = inspect(obj)
        for col in state.mapper.column_attrs:
            if col.key in SKIP_FIELDS:
                continue
            history = state.attrs[col.key].history
            if not history.has_changes():
                continue
            old = history.deleted[0] if history.deleted else None
            new = history.added[0] if history.added else None
            if _stringify(old) == _stringify(new):
                continue
            if col.key in MASKED_FIELDS:
                old, new = (MASK if old else None), (MASK if new else None)
            rows.append(
                ChangeLog(
                    table_name=obj.__tablename__,
                    record_id=obj.id,
                    action="UPDATE",
                    field_name=col.key,
                    old_value=_stringify(old),
                    new_value=_stringify(new),
                    user_id=user_id,
                )
            )

    for obj in session.deleted:
        if isinstance(obj, AUDITED):
            rows.append(
                ChangeLog(
                    table_name=obj.__tablename__,
                    record_id=obj.id,
                    action="DELETE",
                    field_name=None,
                    old_value=_snapshot(obj),
                    new_value=None,
                    user_id=user_id,
                )
            )
    return rows


@event.listens_for(Session, "after_flush")
def _collect(session: Session, _ctx: UOWTransaction) -> None:
    """Attribute history is still intact here; new rows already have their PKs."""
    rows = _entries(session)
    if rows:
        session.info.setdefault(_PENDING, []).extend(rows)


@event.listens_for(Session, "after_flush_postexec")
def _emit(session: Session, _ctx: UOWTransaction) -> None:
    """Add the collected rows; the flush loop picks them up in the same transaction."""
    rows = session.info.pop(_PENDING, None)
    if rows:
        session.add_all(rows)
