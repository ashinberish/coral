"""Common FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends, Request

from coral_api.core.config import Settings
from coral_api.db.session import DatabaseDep, SessionDep


def get_app_settings(request: Request) -> Settings:
    """The settings this application instance was created with."""
    settings: Settings = request.app.state.settings
    return settings


SettingsDep = Annotated[Settings, Depends(get_app_settings)]

__all__ = ["DatabaseDep", "SessionDep", "SettingsDep"]
