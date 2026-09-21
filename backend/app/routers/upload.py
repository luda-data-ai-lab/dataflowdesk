"""Excel template / upload / export / history endpoints (SPEC §4.3)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import (
    DEFAULT_INTERFACE_STATUS,
    DEFAULT_PAGE_SIZE,
    INTERFACE_SHEET,
    MAX_PAGE_SIZE,
    SYSTEM_SHEET,
)
from app.database import get_db
from app.models import Interface, System, UploadHistory
from app.schemas.common import Page
from app.schemas.upload import RowError, UploadHistoryOut, UploadResult
from app.services import crypto, excel_parser

router = APIRouter(prefix="/api/upload", tags=["upload"])

XLSX_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _xlsx_response(content: bytes, filename: str) -> Response:
    """Return xlsx bytes as a download."""
    return Response(
        content=content,
        media_type=XLSX_MEDIA,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


async def _read_upload(file: UploadFile) -> bytes:
    """Validate the upload is an xlsx and return its bytes."""
    if not (file.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Only .xlsx files are accepted")
    content = await file.read()
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Empty file")
    return content


async def _record_history(
    db: AsyncSession, file_name: str, sheet: str, success: int, skipped: int
) -> None:
    """Persist one `upload_history` row. `user_id` is NULL until Phase 3 auth."""
    history_status = "Success" if skipped == 0 else ("Partial" if success else "Failed")
    db.add(
        UploadHistory(
            file_name=file_name,
            sheet=sheet,
            record_count=success,
            skipped_count=skipped,
            status=history_status,
        )
    )


@router.get("/template")
async def download_template() -> Response:
    """Download the two-sheet template with sample rows."""
    return _xlsx_response(excel_parser.build_template(), "if_manager_template.xlsx")


@router.post("/interfaces", response_model=UploadResult)
async def upload_interfaces(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
) -> UploadResult:
    """Import the '인터페이스 리스트' sheet. Invalid rows are skipped and reported."""
    content = await _read_upload(file)
    try:
        parsed = excel_parser.parse_interfaces(content)
    except excel_parser.ExcelFormatError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    errors = [RowError(row=e.row, field=e.field, reason=e.reason) for e in parsed.errors]
    systems = {s.system_code: s.id for s in (await db.execute(select(System))).scalars().all()}
    existing_ids = set((await db.execute(select(Interface.interface_id))).scalars().all())
    seen_in_file: set[str] = set()
    success = 0
    for rec in parsed.rows:
        row = rec["_row"]
        iid = rec["interface_id"]
        if iid in existing_ids or iid in seen_in_file:
            errors.append(RowError(row=row, field="인터페이스 ID", reason="duplicate interface_id"))
            continue
        src = systems.get(rec["source_system_code"])
        tgt = systems.get(rec["target_system_code"])
        if src is None:
            errors.append(
                RowError(
                    row=row,
                    field="소스시스템",
                    reason=f"unknown system_code '{rec['source_system_code']}'",
                )
            )
            continue
        if tgt is None:
            errors.append(
                RowError(
                    row=row,
                    field="타켓시스템",
                    reason=f"unknown system_code '{rec['target_system_code']}'",
                )
            )
            continue
        db.add(
            Interface(
                interface_id=iid,
                interface_name=rec["interface_name"],
                integration_type=rec["integration_type"],
                process=rec.get("process"),
                source_system_id=src,
                target_system_id=tgt,
                cycle=rec["cycle"],
                description=rec.get("description"),
                status=DEFAULT_INTERFACE_STATUS,
            )
        )
        seen_in_file.add(iid)
        success += 1

    errors.sort(key=lambda e: e.row)
    await _record_history(db, file.filename or "upload.xlsx", "interfaces", success, len(errors))
    await db.commit()
    return UploadResult(
        file_name=file.filename or "upload.xlsx",
        sheet=INTERFACE_SHEET,
        success_count=success,
        skipped_count=len(errors),
        errors=errors,
    )


@router.post("/systems", response_model=UploadResult)
async def upload_systems(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
) -> UploadResult:
    """Import the '시스템 연동정보' sheet. Duplicate `system_code`s are skipped."""
    content = await _read_upload(file)
    try:
        parsed = excel_parser.parse_systems(content)
    except excel_parser.ExcelFormatError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    errors = [RowError(row=e.row, field=e.field, reason=e.reason) for e in parsed.errors]
    existing = set((await db.execute(select(System.system_code))).scalars().all())
    seen_in_file: set[str] = set()
    success = 0
    for rec in parsed.rows:
        code = rec["system_code"]
        if code in existing or code in seen_in_file:
            errors.append(
                RowError(row=rec["_row"], field="시스템코드", reason="duplicate system_code")
            )
            continue
        db.add(
            System(
                category=rec["category"],
                type=rec["type"],
                system_name=rec["system_name"],
                system_code=code,
                ip=rec.get("ip"),
                port=rec.get("port"),
                account=rec.get("account"),
                password_encrypted=crypto.encrypt(rec.get("password")),
                product_name=rec.get("product_name"),
                description=rec.get("description"),
            )
        )
        seen_in_file.add(code)
        success += 1

    errors.sort(key=lambda e: e.row)
    await _record_history(db, file.filename or "upload.xlsx", "systems", success, len(errors))
    await db.commit()
    return UploadResult(
        file_name=file.filename or "upload.xlsx",
        sheet=SYSTEM_SHEET,
        success_count=success,
        skipped_count=len(errors),
        errors=errors,
    )


@router.get("/export")
async def export_all(
    include_password: bool = Query(False, description="write decrypted passwords"),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export every interface and system in the template layout.

    TODO(phase3): restrict `include_password` to the admin role.
    """
    interfaces = (
        (await db.execute(select(Interface).order_by(Interface.interface_id)))
        .unique()
        .scalars()
        .all()
    )
    systems = (await db.execute(select(System).order_by(System.id))).scalars().all()

    if_rows: list[list[Any]] = [
        [
            i.interface_id,
            i.interface_name,
            i.integration_type,
            i.process,
            i.source_system.system_code if i.source_system else None,
            i.target_system.system_code if i.target_system else None,
            i.cycle,
            i.description,
        ]
        for i in interfaces
    ]
    sys_rows: list[list[Any]] = [
        [
            idx,
            s.category,
            s.type,
            s.system_name,
            s.system_code,
            s.ip,
            s.port,
            s.account,
            crypto.decrypt(s.password_encrypted) if include_password else None,
            s.product_name,
            s.description,
        ]
        for idx, s in enumerate(systems, start=1)
    ]
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return _xlsx_response(
        excel_parser.build_workbook(if_rows, sys_rows), f"if_manager_export_{stamp}.xlsx"
    )


@router.get("/history", response_model=Page[UploadHistoryOut])
async def upload_history(
    page: int = Query(1, ge=1),
    size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: AsyncSession = Depends(get_db),
) -> Page[UploadHistoryOut]:
    """Upload history, newest first."""
    total = (await db.execute(select(func.count(UploadHistory.id)))).scalar_one()
    rows = (
        (
            await db.execute(
                select(UploadHistory)
                .order_by(UploadHistory.uploaded_at.desc(), UploadHistory.id.desc())
                .offset((page - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    return Page(
        items=[UploadHistoryOut.model_validate(r) for r in rows], total=total, page=page, size=size
    )
