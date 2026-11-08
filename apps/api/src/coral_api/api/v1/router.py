"""Versioned public API. Feature routers are included here as modules land."""

from fastapi import APIRouter

from coral_api.api.deps import SettingsDep
from coral_api.modules.health.schemas import Meta

router = APIRouter()


@router.get("/meta", tags=["meta"], summary="Service metadata")
async def meta(settings: SettingsDep) -> Meta:
    return Meta(name=settings.app_name, version=settings.version, environment=settings.env.value)
