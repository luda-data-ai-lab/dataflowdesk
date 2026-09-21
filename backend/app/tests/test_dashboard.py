"""Tests for /api/dashboard/* aggregations (SPEC §8: fixture data → counts match)."""

from __future__ import annotations

from httpx import AsyncClient

from app.tests.conftest import create_interface, create_system


async def _fixture(client: AsyncClient) -> None:
    """SAP↔CRM (2 real-time), HR→SAP (1 batch, inactive), WEB isolated."""
    sap = await create_system(client)
    crm = await create_system(client, system_code="CRM", type="DB")
    hr = await create_system(client, system_code="HR", type="DB")
    await create_system(client, system_code="WEB", type="REST")
    await create_interface(client, sap["id"], crm["id"])
    await create_interface(
        client, crm["id"], sap["id"], interface_id="002_CRM_SAP", integration_type="DB-SAP"
    )
    await create_interface(
        client,
        hr["id"],
        sap["id"],
        interface_id="003_HR_SAP",
        integration_type="JSON-SAP",
        cycle="Batch",
        status="Inactive",
    )


async def test_summary_empty(client: AsyncClient) -> None:
    """No data → zeros, no division error."""
    resp = await client.get("/api/dashboard/summary")
    assert resp.status_code == 200
    assert resp.json() == {
        "total_interfaces": 0,
        "total_systems": 0,
        "active_interfaces": 0,
        "realtime_ratio": 0.0,
        "recent_changes": 0,
    }


async def test_summary_counts(client: AsyncClient) -> None:
    await _fixture(client)
    body = (await client.get("/api/dashboard/summary")).json()
    assert body["total_interfaces"] == 3
    assert body["total_systems"] == 4
    assert body["active_interfaces"] == 2
    assert body["realtime_ratio"] == 66.7
    assert body["recent_changes"] == 7  # one CREATE change_log row per system / interface


async def test_by_system(client: AsyncClient) -> None:
    """Source + target counted separately; busiest first; isolated systems included with 0."""
    await _fixture(client)
    rows = (await client.get("/api/dashboard/by-system")).json()
    by_code = {r["system_code"]: r for r in rows}
    assert [r["system_code"] for r in rows] == ["SAP", "CRM", "HR", "WEB"]
    assert by_code["SAP"] == {
        **by_code["SAP"],
        "source_count": 1,
        "target_count": 2,
        "total": 3,
    }
    assert by_code["CRM"]["total"] == 2
    assert by_code["HR"]["total"] == 1
    assert by_code["WEB"]["total"] == 0


async def test_by_type_and_cycle(client: AsyncClient) -> None:
    await _fixture(client)
    by_type = (await client.get("/api/dashboard/by-type")).json()
    assert {r["label"]: r["count"] for r in by_type} == {"SAP-DB": 1, "DB-SAP": 1, "JSON-SAP": 1}
    by_cycle = (await client.get("/api/dashboard/by-cycle")).json()
    assert by_cycle == [{"label": "Real Time", "count": 2}, {"label": "Batch", "count": 1}]
