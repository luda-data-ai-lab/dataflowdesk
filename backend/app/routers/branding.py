"""Customer branding settings: company name + logo (`/api/settings/branding`).

Single-row resource. The logo is validated by magic bytes (not just the
declared content type) and served back from `/api/settings/branding/logo`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Branding
from app.models.branding import BRANDING_ROW_ID
from app.schemas.branding import BrandingOut, BrandingUpdate
from app.services import auth

router = APIRouter(prefix="/api/settings/branding", tags=["settings"])

MAX_LOGO_BYTES = 1 * 1024 * 1024
LOGO_PATH = "/api/settings/branding/logo"


def _sniff_image(content: bytes) -> str | None:
    """Return the image MIME type detected from the file signature, or None."""
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    head = content[:512].lstrip().lower()
    if head.startswith(b"<svg") or (head.startswith(b"<?xml") and b"<svg" in head):
        return "image/svg+xml"
    return None


async def _get_or_create(db: AsyncSession) -> Branding:
    """Load the singleton branding row, creating it on first access."""
    row = await db.get(Branding, BRANDING_ROW_ID)
    if row is None:
        row = Branding(id=BRANDING_ROW_ID)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


def _to_out(row: Branding) -> BrandingOut:
    """Map the ORM row to the API shape, adding a cache-busting logo URL."""
    logo_url = None
    if row.logo_data:
        logo_url = f"{LOGO_PATH}?v={int(row.updated_at.timestamp())}"
    return BrandingOut(
        company_name=row.company_name,
        tagline=row.tagline,
        logo_url=logo_url,
        logo_mime=row.logo_mime,
        logo_size=row.logo_size,
        updated_at=row.updated_at,
    )


@router.get("", response_model=BrandingOut)
async def get_branding(db: AsyncSession = Depends(get_db)) -> BrandingOut:
    """Return current branding (defaults when nothing has been configured)."""
    return _to_out(await _get_or_create(db))


@router.put("", response_model=BrandingOut, dependencies=[Depends(auth.get_current_user)])
async def update_branding(
    payload: BrandingUpdate, db: AsyncSession = Depends(get_db)
) -> BrandingOut:
    """Update company name / tagline. Empty strings clear the value."""
    row = await _get_or_create(db)
    row.company_name = (payload.company_name or "").strip() or None
    row.tagline = (payload.tagline or "").strip() or None
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.post("/logo", response_model=BrandingOut, dependencies=[Depends(auth.get_current_user)])
async def upload_logo(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
) -> BrandingOut:
    """Replace the company logo (PNG/JPEG/GIF/WebP/SVG, max 1 MB)."""
    content = await file.read()
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(content) > MAX_LOGO_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Logo must be {MAX_LOGO_BYTES // 1024} KB or smaller",
        )
    mime = _sniff_image(content)
    if mime is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image; use PNG, JPEG, GIF, WebP or SVG",
        )
    row = await _get_or_create(db)
    row.logo_data = content
    row.logo_mime = mime
    row.logo_size = len(content)
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.delete("/logo", response_model=BrandingOut, dependencies=[Depends(auth.get_current_user)])
async def delete_logo(db: AsyncSession = Depends(get_db)) -> BrandingOut:
    """Remove the company logo (falls back to the default text header)."""
    row = await _get_or_create(db)
    row.logo_data = None
    row.logo_mime = None
    row.logo_size = None
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.get("/logo", response_model=None)
async def get_logo(db: AsyncSession = Depends(get_db)) -> Response:
    """Serve the raw logo bytes."""
    row = await db.get(Branding, BRANDING_ROW_ID)
    if row is None or not row.logo_data or not row.logo_mime:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No logo configured")
    return Response(
        content=row.logo_data,
        media_type=row.logo_mime,
        headers={"Cache-Control": "public, max-age=3600"},
    )
