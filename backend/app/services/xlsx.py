"""xlsx download response helper shared by the upload / list-export endpoints."""

from __future__ import annotations

from urllib.parse import quote

from fastapi import Response

XLSX_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def xlsx_response(content: bytes, filename: str) -> Response:
    """Return xlsx bytes as a download."""
    return Response(
        content=content,
        media_type=XLSX_MEDIA,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )
