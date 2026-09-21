"""Insert the initial admin account and the SPEC §7 sample systems / interfaces (plus IFSYS).

Usage (from `backend/`): `python seed.py`. Idempotent — existing codes/ids are skipped.
"""

from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models import Interface, System, User
from app.services import auth, crypto

# system_code for sample row 5 is blank in SPEC §7 — see QUESTIONS.md Q3
SAMPLE_SYSTEMS: list[dict[str, Any]] = [
    dict(category="운영", type="ERP", system_name="ERP 시스템", system_code="SAP", ip="10.1.1.1", port=None, account="erp01", password="erp01", product_name="SAP", description="SAP ERP 시스템"),
    dict(category="운영", type="DB", system_name="고객관리시스템", system_code="CRM", ip="11.1.1.1", port=5422, account="crmuser01", password="1234", product_name="Postgrese", description="고객관리시스템"),
    dict(category="운영", type="DB", system_name="HR 시스템", system_code="HR", ip="12.2.2.2", port=1521, account="hruser01", password="1234", product_name="MS SQL", description="HR 시스템"),
    dict(category="운영", type="REST", system_name="점포관리", system_code="WEB", ip="13.1.1.1", port=10040, account="webadmin01", password="1234", product_name="jeus", description="점포관리"),
    dict(category="운영", type="FTP", system_name="파일관리 시스템", system_code="FILE", ip="14.1.1.1", port=443, account="filesuser01", password="1234", product_name="AWS", description="파일관리 시스템"),
    dict(category="운영", type="EAI", system_name="인터페이스 시스템", system_code="IFSYS", ip="15.1.1.1", port=8080, account="eaiadmin", password="1234", product_name="EAI", description="시스템 간 인터페이스를 중계하는 EAI 허브"),
    dict(category="개발", type="ERP", system_name="ERP 개발 시스템", system_code="SAP_DEV", ip="10.1.1.2", port=None, account="erp01", password="erp01", product_name="SAP", description="SAP 개발 ERP 시스템"),
]  # fmt: skip

SAMPLE_INTERFACES: list[dict[str, Any]] = [
    dict(interface_id="001_SAP_CRM", interface_name="고객정보연동", integration_type="SAP-DB", process="SAP-EAI-CRM(DB)-SAP", source="SAP", target="CRM", via="IFSYS", cycle="Real Time", description="SAP에서 고객정보가 발생하면 CRM으로 전송한다"),
    dict(interface_id="002_CRM_SAP", interface_name="고객클레임정보", integration_type="DB-SAP", process="CRM(DB)-EAI-SAP-CRM", source="CRM", target="SAP", via="IFSYS", cycle="Batch", description="CRM에서 클레임 정보가 발생하면 SAP로 변경 데이터를 전송한다."),
    dict(interface_id="003_HR_SAP", interface_name="고객정보 조회", integration_type="JSON-SAP", process="WEB(JSON)-EAI-SAP-WEB", source="HR", target="SAP", via="IFSYS", cycle="Real Time", description="HR시스템에서 고객 정보 필요시 web service를 통해서 SAP를 조회 후 수신한다."),
]  # fmt: skip


async def seed() -> None:
    """Insert missing sample rows and print a summary."""
    settings = get_settings()
    async with SessionLocal() as db:
        admin_exists = (
            await db.execute(select(User.id).where(User.username == settings.admin_username))
        ).scalar_one_or_none()
        added_admin = 0
        if admin_exists is None:
            db.add(
                User(
                    username=settings.admin_username,
                    password_hash=auth.hash_password(settings.admin_password),
                    display_name="관리자",
                    role="admin",
                    is_active=True,
                )
            )
            added_admin = 1
            await db.commit()

        existing_codes = set((await db.execute(select(System.system_code))).scalars().all())
        added_systems = 0
        for row in SAMPLE_SYSTEMS:
            if row["system_code"] in existing_codes:
                continue
            data = {k: v for k, v in row.items() if k != "password"}
            db.add(System(**data, password_encrypted=crypto.encrypt(row["password"])))
            added_systems += 1
        await db.commit()

        code_to_id = {
            s.system_code: s.id for s in (await db.execute(select(System))).scalars().all()
        }
        existing_ids = set((await db.execute(select(Interface.interface_id))).scalars().all())
        added_ifs = 0
        for row in SAMPLE_INTERFACES:
            if row["interface_id"] in existing_ids:
                continue
            data = {k: v for k, v in row.items() if k not in ("source", "target", "via")}
            via = row.get("via")
            db.add(
                Interface(
                    **data,
                    source_system_id=code_to_id[row["source"]],
                    target_system_id=code_to_id[row["target"]],
                    via_system_id=code_to_id[via] if via else None,
                    status="Active",
                )
            )
            added_ifs += 1
        await db.commit()
    print(f"seed: +{added_admin} admin, +{added_systems} systems, +{added_ifs} interfaces")


if __name__ == "__main__":
    asyncio.run(seed())
