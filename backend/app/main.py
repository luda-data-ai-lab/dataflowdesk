"""FastAPI application entry point: `uvicorn app.main:app --reload`."""

from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    auth,
    branding,
    changelog,
    dashboard,
    interfaces,
    systems,
    topology,
    upload,
    users,
)
from app.services import audit  # noqa: F401 - registers change_log flush listeners
from app.services.auth import get_current_user

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

authenticated = [Depends(get_current_user)]
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(systems.router, dependencies=authenticated)
app.include_router(interfaces.router, dependencies=authenticated)
app.include_router(upload.router, dependencies=authenticated)
app.include_router(topology.router, dependencies=authenticated)
app.include_router(dashboard.router, dependencies=authenticated)
app.include_router(changelog.router, dependencies=authenticated)
# GET /api/branding(/logo) stays public for the login page; mutations require auth
app.include_router(branding.router)


@app.get("/api/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "db_type": settings.db_type}
