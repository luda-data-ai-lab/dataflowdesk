"""Topology API: systems as nodes, interfaces as directed edges, IFSYS at the centre."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import HUB_SYSTEM_CODE
from app.database import get_db
from app.models import Interface, System
from app.schemas.topology import TopologyEdge, TopologyInterface, TopologyNode, TopologyOut

router = APIRouter(prefix="/api/topology", tags=["topology"])


@router.get("", response_model=TopologyOut)
async def get_topology(
    category: str | None = Query(None, description="restrict systems to a category"),
    status_: str | None = Query(None, alias="status", description="restrict interfaces"),
    hub: str = Query(HUB_SYSTEM_CODE, description="system_code to place at the centre"),
    db: AsyncSession = Depends(get_db),
) -> TopologyOut:
    """Build the configuration diagram model.

    Interfaces with `via_system_id` are split into `source -> via` and `via -> target`
    edges; interfaces without one become a single `source -> target` edge. Systems
    with no interfaces are still returned as isolated nodes.
    """
    sys_stmt = select(System).order_by(System.system_code)
    if category:
        sys_stmt = sys_stmt.where(System.category == category)
    systems = (await db.execute(sys_stmt)).scalars().all()
    by_id = {s.id: s for s in systems}

    if_stmt = select(Interface)
    if status_:
        if_stmt = if_stmt.where(Interface.status == status_)
    interfaces = (await db.execute(if_stmt)).unique().scalars().all()

    edges: dict[tuple[int, int], list[TopologyInterface]] = {}
    counts: dict[int, int] = {sid: 0 for sid in by_id}
    for iface in interfaces:
        src, tgt, via = iface.source_system_id, iface.target_system_id, iface.via_system_id
        if src is None or tgt is None or src not in by_id or tgt not in by_id:
            continue
        hops = [(src, via), (via, tgt)] if via is not None and via in by_id else [(src, tgt)]
        brief = TopologyInterface(
            id=iface.id,
            interface_id=iface.interface_id,
            interface_name=iface.interface_name,
            integration_type=iface.integration_type,
            cycle=iface.cycle,
            status=iface.status,
        )
        for a, b in hops:
            assert a is not None and b is not None
            edges.setdefault((a, b), []).append(brief)
        for sid in {src, tgt, *([via] if via in by_id else [])}:
            counts[sid] += 1

    hub_system = next((s for s in systems if s.system_code == hub), None)
    nodes = [
        TopologyNode(
            id=s.id,
            system_code=s.system_code,
            system_name=s.system_name,
            type=s.type,
            category=s.category,
            product_name=s.product_name,
            is_hub=hub_system is not None and s.id == hub_system.id,
            interface_count=counts[s.id],
        )
        for s in systems
    ]
    return TopologyOut(
        hub_id=hub_system.id if hub_system else None,
        hub_code=hub,
        nodes=nodes,
        edges=[
            TopologyEdge(source_id=a, target_id=b, interfaces=ifs)
            for (a, b), ifs in sorted(edges.items())
        ],
    )
