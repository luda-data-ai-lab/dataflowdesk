"""Tests for /api/systems."""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient

from app.constants import PASSWORD_MASK
from app.tests.conftest import create_system


async def test_create_and_get_masks_password(client: AsyncClient) -> None:
    """Create returns masked password; detail reveals it only with include_password."""
    created = await create_system(client)
    assert created["password"] == PASSWORD_MASK
    assert created["has_password"] is True

    detail = await client.get(f"/api/systems/{created['id']}")
    assert detail.status_code == 200
    assert detail.json()["password"] == PASSWORD_MASK

    revealed = await client.get(f"/api/systems/{created['id']}", params={"include_password": True})
    assert revealed.json()["password"] == "erp01"


async def test_create_without_password(client: AsyncClient) -> None:
    """Password is optional."""
    created = await create_system(client, password=None)
    assert created["password"] is None
    assert created["has_password"] is False


async def test_duplicate_code_conflict(client: AsyncClient) -> None:
    """Duplicate system_code → 409."""
    await create_system(client)
    resp = await client.post(
        "/api/systems",
        json={"category": "운영", "type": "DB", "system_name": "x", "system_code": "SAP"},
    )
    assert resp.status_code == 409
    assert "detail" in resp.json()


async def test_validation_error(client: AsyncClient) -> None:
    """Missing required fields → 422."""
    resp = await client.post("/api/systems", json={"category": "운영"})
    assert resp.status_code == 422


async def test_list_filters_and_pagination(client: AsyncClient) -> None:
    """Category / type / keyword filters and paging."""
    await create_system(client)
    await create_system(client, system_code="CRM", type="DB", system_name="고객관리시스템")
    await create_system(client, system_code="SAP_DEV", category="개발")

    all_resp = await client.get("/api/systems")
    assert all_resp.json()["total"] == 3

    ops = await client.get("/api/systems", params={"category": "운영"})
    assert ops.json()["total"] == 2

    dbs = await client.get("/api/systems", params={"type": "DB"})
    assert [s["system_code"] for s in dbs.json()["items"]] == ["CRM"]

    kw = await client.get("/api/systems", params={"keyword": "고객"})
    assert kw.json()["total"] == 1

    paged = await client.get("/api/systems", params={"page": 2, "size": 2})
    assert len(paged.json()["items"]) == 1
    assert paged.json()["page"] == 2

    for item in all_resp.json()["items"]:
        assert item["password"] in (PASSWORD_MASK, None)


async def test_update_keeps_password_when_omitted(client: AsyncClient) -> None:
    """PUT without password keeps the stored one; with password replaces it."""
    created = await create_system(client)
    body: dict[str, Any] = {
        k: v for k, v in created.items() if k in ("category", "type", "system_name", "system_code")
    }
    body.update({"ip": "10.9.9.9", "port": 8080})
    resp = await client.put(f"/api/systems/{created['id']}", json=body)
    assert resp.status_code == 200
    assert resp.json()["ip"] == "10.9.9.9"
    revealed = await client.get(f"/api/systems/{created['id']}", params={"include_password": True})
    assert revealed.json()["password"] == "erp01"

    body["password"] = "new-secret"
    await client.put(f"/api/systems/{created['id']}", json=body)
    revealed = await client.get(f"/api/systems/{created['id']}", params={"include_password": True})
    assert revealed.json()["password"] == "new-secret"


async def test_update_not_found(client: AsyncClient) -> None:
    """PUT unknown id → 404."""
    resp = await client.put(
        "/api/systems/999",
        json={"category": "운영", "type": "DB", "system_name": "x", "system_code": "X"},
    )
    assert resp.status_code == 404


async def test_delete_and_delete_protection(client: AsyncClient, seeded: dict[str, Any]) -> None:
    """Referenced systems cannot be deleted (409); unreferenced ones can (204)."""
    protected = await client.delete(f"/api/systems/{seeded['sap']['id']}")
    assert protected.status_code == 409
    assert "referenced" in protected.json()["detail"]

    free = await client.delete(f"/api/systems/{seeded['hr']['id']}")
    assert free.status_code == 204
    assert (await client.get(f"/api/systems/{seeded['hr']['id']}")).status_code == 404


async def test_interface_count(client: AsyncClient, seeded: dict[str, Any]) -> None:
    """interface_count counts source and target references."""
    detail = await client.get(f"/api/systems/{seeded['sap']['id']}")
    assert detail.json()["interface_count"] == 2
    hr = await client.get(f"/api/systems/{seeded['hr']['id']}")
    assert hr.json()["interface_count"] == 0
