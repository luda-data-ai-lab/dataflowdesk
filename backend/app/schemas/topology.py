"""Schemas for the topology (configuration diagram) API."""

from __future__ import annotations

from pydantic import BaseModel


class TopologyNode(BaseModel):
    """A system drawn as a node."""

    id: int
    system_code: str
    system_name: str
    type: str
    category: str
    product_name: str | None = None
    is_hub: bool = False
    interface_count: int = 0


class TopologyInterface(BaseModel):
    """Minimal interface info listed on an edge."""

    id: int
    interface_id: str
    interface_name: str
    integration_type: str
    cycle: str
    status: str


class TopologyEdge(BaseModel):
    """A directed connection between two nodes.

    An interface routed through a hub yields two edges (source->hub, hub->target);
    a direct interface yields one edge (source->target).
    """

    source_id: int
    target_id: int
    interfaces: list[TopologyInterface]


class TopologyOut(BaseModel):
    """Nodes + aggregated edges; `hub_id` is the node to place at the centre."""

    hub_id: int | None
    hub_code: str
    nodes: list[TopologyNode]
    edges: list[TopologyEdge]
