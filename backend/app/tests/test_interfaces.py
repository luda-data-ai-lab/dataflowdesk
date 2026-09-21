"""Tests for /api/interfaces."""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient

from app.tests.conftest import create_interface, create_system


async def test_create_embeds_systems(client: AsyncClient, seeded: dict[str, Any]) -> None:
    """Created interface carries source/target system refs and default status."""
    if1 = seeded["if1"]
    assert if1["source_system"]["system_code"] == "SAP"
    assert if1["target_system"]["system_code"] == "CRM"
    assert if1["status"] == "Active"


async def test_get_detail_and_404(client: AsyncClient, seeded: dict[str, Any]) -> None:
    """Detail endpoint and not-found."""
    resp = await client.get(f"/api/interfaces/{seeded['if1']['id']}")
    assert resp.status_code == 200
    assert resp.json()["interface_id"] == "001_SAP_CRM"
    assert (await client.get("/api/interfaces/9999")).status_code == 404


async def test_create_unknown_system_400(client: AsyncClient) -> None:
    """Source/target FK validation."""
    sap = await create_system(client)
    resp = await client.post(
        "/api/interfaces",
        json={
            "interface_id": "X",
            "interface_name": "x",
            "integration_type": "SAP-DB",
            "source_system_id": sap["id"],
            "target_system_id": 9999,
            "cycle": "Batch",
        },
    )
    assert resp.status_code == 400
    assert "target_system_id" in resp.json()["detail"]


async def test_duplicate_interface_id_409(client: AsyncClient, seeded: dict[str, Any]) -> None:
    """interface_id must be unique."""
    resp = await client.post(
        "/api/interfaces",
        json={
            "interface_id": "001_SAP_CRM",
            "interface_name": "dup",
            "integration_type": "SAP-DB",
            "source_system_id": seeded["sap"]["id"],
            "target_system_id": seeded["crm"]["id"],
            "cycle": "Batch",
        },
    )
    assert resp.status_code == 409


async def test_list_filters(client: AsyncClient, seeded: dict[str, Any]) -> None:
    """Filters by type, source, target, system, cycle, status and keyword."""

    async def total(**params: Any) -> int:
        resp = await client.get("/api/interfaces", params=params)
        assert resp.status_code == 200, resp.text
        return resp.json()["total"]

    assert await total() == 2
    assert await total(integration_type="SAP-DB") == 1
    assert await total(source="SAP") == 1
    assert await total(target="SAP") == 1
    assert await total(system="SAP") == 2
    assert await total(system="HR") == 0
    assert await total(cycle="Batch") == 1
    assert await total(status="Active") == 2
    assert await total(status="Inactive") == 0
    assert await total(keyword="클레임") == 1
    assert await total(keyword="EAI") == 2


async def test_list_sort_and_pagination(client: AsyncClient, seeded: dict[str, Any]) -> None:
    """Sort descending and page size 1."""
    resp = await client.get("/api/interfaces", params={"sort": "-interface_id", "size": 1})
    body = resp.json()
    assert body["total"] == 2
    assert len(body["items"]) == 1
    assert body["items"][0]["interface_id"] == "002_CRM_SAP"

    bad = await client.get("/api/interfaces", params={"sort": "nope"})
    assert bad.status_code == 400


async def test_update(client: AsyncClient, seeded: dict[str, Any]) -> None:
    """PUT replaces fields and re-validates systems."""
    if1 = seeded["if1"]
    body = {
        "interface_id": if1["interface_id"],
        "interface_name": "변경됨",
        "integration_type": "SAP-DB",
        "process": if1["process"],
        "source_system_id": seeded["hr"]["id"],
        "target_system_id": seeded["sap"]["id"],
        "cycle": "Batch",
        "description": None,
        "status": "Inactive",
    }
    resp = await client.put(f"/api/interfaces/{if1['id']}", json=body)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["interface_name"] == "변경됨"
    assert data["source_system"]["system_code"] == "HR"
    assert data["status"] == "Inactive"

    body["target_system_id"] = 9999
    assert (await client.put(f"/api/interfaces/{if1['id']}", json=body)).status_code == 400


async def test_delete(client: AsyncClient, seeded: dict[str, Any]) -> None:
    """DELETE removes the interface and frees the system for deletion."""
    for key in ("if1", "if2"):
        assert (await client.delete(f"/api/interfaces/{seeded[key]['id']}")).status_code == 204
    assert (await client.delete(f"/api/interfaces/{seeded['if1']['id']}")).status_code == 404
    assert (await client.delete(f"/api/systems/{seeded['sap']['id']}")).status_code == 204


async def test_create_helper_roundtrip(client: AsyncClient) -> None:
    """Minimal create via helper without optional fields."""
    a = await create_system(client)
    b = await create_system(client, system_code="B")
    created = await create_interface(client, a["id"], b["id"], process=None, description=None)
    assert created["process"] is None
