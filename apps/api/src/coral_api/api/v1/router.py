"""Versioned public API. Feature routers are included here as modules land."""

from fastapi import APIRouter

from coral_api.api.deps import SettingsDep
from coral_api.modules.auth.router import router as auth_router
from coral_api.modules.health.schemas import Meta
from coral_api.modules.users.router import router as users_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(users_router)


@router.get("/meta", tags=["meta"], summary="Service metadata")
async def meta(settings: SettingsDep) -> Meta:
    return Meta(name=settings.app_name, version=settings.version, environment=settings.env.value)
