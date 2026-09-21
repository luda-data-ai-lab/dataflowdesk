"""Shared schema helpers (pagination envelope)."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Paginated list response."""

    items: list[T]
    total: int
    page: int
    size: int

    @property
    def pages(self) -> int:
        """Number of pages for the given size."""
        return (self.total + self.size - 1) // self.size if self.size else 0
