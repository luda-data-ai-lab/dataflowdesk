"""Shared fixtures: in-memory SQLite database and an httpx test client."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.database import Base, get_db
from app.main import app

SYSTEM_PAYLOAD: dict[str, Any] = {
    "category": "운영",
    "type": "ERP",
    "system_name": "ERP 시스템",
    "system_code": "SAP",
    "ip": "10.1.1.1",
    "port": None,
    "account": "erp01",
    "password": "erp01",
    "product_name": "SAP",
    "description": "SAP ERP 시스템",
}


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Fresh in-memory DB per test, wired into the FastAPI dependency."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


async def create_system(client: AsyncClient, **overrides: Any) -> dict[str, Any]:
    """POST a system and return the response JSON."""
    payload = {**SYSTEM_PAYLOAD, **overrides}
    resp = await client.post("/api/systems", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def create_interface(
    client: AsyncClient, source_id: int, target_id: int, **overrides: Any
) -> dict[str, Any]:
    """POST an interface and return the response JSON."""
    payload: dict[str, Any] = {
        "interface_id": "001_SAP_CRM",
        "interface_name": "고객정보연동",
        "integration_type": "SAP-DB",
        "process": "SAP-EAI-CRM(DB)-SAP",
        "source_system_id": source_id,
        "target_system_id": target_id,
        "cycle": "Real Time",
        "description": "SAP에서 고객정보가 발생하면 CRM으로 전송한다",
    }
    payload.update(overrides)
    resp = await client.post("/api/interfaces", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
async def seeded(client: AsyncClient) -> dict[str, Any]:
    """Three systems (SAP, CRM, HR) and two interfaces."""
    sap = await create_system(client)
    crm = await create_system(
        client, system_code="CRM", type="DB", system_name="고객관리시스템", port=5422
    )
    hr = await create_system(
        client, system_code="HR", type="DB", system_name="HR 시스템", port=1521
    )
    if1 = await create_interface(client, sap["id"], crm["id"])
    if2 = await create_interface(
        client,
        crm["id"],
        sap["id"],
        interface_id="002_CRM_SAP",
        interface_name="고객클레임정보",
        integration_type="DB-SAP",
        cycle="Batch",
    )
    return {"sap": sap, "crm": crm, "hr": hr, "if1": if1, "if2": if2}
