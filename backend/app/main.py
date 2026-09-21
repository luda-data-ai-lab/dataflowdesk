"""FastAPI application entry point: `uvicorn app.main:app --reload`."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import branding, interfaces, systems, topology, upload

settings = get_settings()

app = FastAPI(
    title="DataFlowDesk API",
    version="0.1.0",
    description="System-to-system interface registry for MES/ERP environments.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(systems.router)
app.include_router(interfaces.router)
app.include_router(upload.router)
app.include_router(topology.router)
app.include_router(branding.router)


@app.get("/api/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "db_type": settings.db_type}
