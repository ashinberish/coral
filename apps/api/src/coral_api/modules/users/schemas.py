import uuid
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserBase(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    timezone: str = Field(default="UTC", max_length=64, examples=["Europe/Berlin"])
    daily_goal_ml: int = Field(default=2500, ge=500, le=10_000)


class UserUpdate(BaseModel):
    """Partial update; omitted fields are left unchanged."""

    display_name: str | None = Field(default=None, max_length=80)
    timezone: str | None = Field(default=None, max_length=64, examples=["Europe/Berlin"])
    daily_goal_ml: int | None = Field(default=None, ge=500, le=10_000)

    @field_validator("timezone")
    @classmethod
    def _valid_timezone(cls, value: str | None) -> str | None:
        if value is not None:
            try:
                ZoneInfo(value)
            except (ZoneInfoNotFoundError, ValueError) as exc:
                raise ValueError(f"unknown IANA timezone: {value}") from exc
        return value


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    created_at: datetime
    updated_at: datetime
