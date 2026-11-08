"""Kubernetes-style probes. Mounted at the root (not versioned)."""

import asyncio

from fastapi import APIRouter, Response, status

from coral_api.core.logging import get_logger
from coral_api.db.session import DatabaseDep
from coral_api.modules.health.schemas import Liveness, Readiness

router = APIRouter(tags=["health"])
logger = get_logger(__name__)

READINESS_TIMEOUT_S = 2.0


@router.get("/healthz", summary="Liveness probe")
async def liveness() -> Liveness:
    return Liveness()


@router.get(
    "/readyz",
    summary="Readiness probe (checks dependencies)",
    responses={503: {"model": Readiness}},
)
async def readiness(database: DatabaseDep, response: Response) -> Readiness:
    checks: dict[str, str] = {}
    try:
        await asyncio.wait_for(database.ping(), timeout=READINESS_TIMEOUT_S)
        checks["database"] = "ok"
    except Exception as exc:  # noqa: BLE001 - any failure means "not ready"
        logger.warning("readiness_check_failed", check="database", error=repr(exc))
        checks["database"] = "fail"

    ready = all(v == "ok" for v in checks.values())
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return Readiness.model_validate({"status": "ok" if ready else "unavailable", "checks": checks})
