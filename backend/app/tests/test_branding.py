"""Tests for `/api/settings/branding` (company name + logo)."""

from __future__ import annotations

from httpx import AsyncClient

PNG_1PX = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?"
    b"\x00\x05\xfe\x02\xfe\xa7V\xbd\xfa\x00\x00\x00\x00IEND\xaeB`\x82"
)
SVG = b'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'


async def test_default_branding_is_empty(client: AsyncClient) -> None:
    r = await client.get("/api/settings/branding")
    assert r.status_code == 200
    body = r.json()
    assert body["company_name"] is None
    assert body["logo_url"] is None


async def test_update_company_name(client: AsyncClient) -> None:
    r = await client.put(
        "/api/settings/branding", json={"company_name": " NeoSlon ", "tagline": ""}
    )
    assert r.status_code == 200
    assert r.json()["company_name"] == "NeoSlon"
    assert r.json()["tagline"] is None

    r = await client.get("/api/settings/branding")
    assert r.json()["company_name"] == "NeoSlon"


async def test_upload_and_serve_logo(client: AsyncClient) -> None:
    r = await client.post(
        "/api/settings/branding/logo",
        files={"file": ("logo.png", PNG_1PX, "application/octet-stream")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["logo_mime"] == "image/png"
    assert body["logo_size"] == len(PNG_1PX)
    assert body["logo_url"].startswith("/api/settings/branding/logo?v=")

    r = await client.get("/api/settings/branding/logo")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.content == PNG_1PX


async def test_upload_svg_detected_by_content(client: AsyncClient) -> None:
    r = await client.post(
        "/api/settings/branding/logo", files={"file": ("logo.txt", SVG, "text/plain")}
    )
    assert r.status_code == 200
    assert r.json()["logo_mime"] == "image/svg+xml"


async def test_upload_rejects_non_image(client: AsyncClient) -> None:
    r = await client.post(
        "/api/settings/branding/logo",
        files={"file": ("logo.png", b"not an image", "image/png")},
    )
    assert r.status_code == 400


async def test_upload_rejects_oversized(client: AsyncClient) -> None:
    big = PNG_1PX + b"\x00" * (1024 * 1024)
    r = await client.post(
        "/api/settings/branding/logo", files={"file": ("big.png", big, "image/png")}
    )
    assert r.status_code == 413


async def test_delete_logo(client: AsyncClient) -> None:
    await client.post(
        "/api/settings/branding/logo", files={"file": ("logo.png", PNG_1PX, "image/png")}
    )
    r = await client.delete("/api/settings/branding/logo")
    assert r.status_code == 200
    assert r.json()["logo_url"] is None
    assert (await client.get("/api/settings/branding/logo")).status_code == 404
