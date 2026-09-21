"""Dashboard aggregation schemas (SPEC §2.4 / §4.4)."""

from __future__ import annotations

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_interfaces: int
    total_systems: int
    active_interfaces: int
    realtime_ratio: float
    """Share of interfaces with cycle == 'Real Time', 0..100 (one decimal)."""
    recent_changes: int
    """change_log rows in the last 7 days (0 until Phase 3 enables logging)."""


class SystemCount(BaseModel):
    system_id: int
    system_code: str
    system_name: str
    type: str
    source_count: int
    target_count: int
    total: int


class LabelCount(BaseModel):
    label: str
    count: int
