import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    timezone: str = Field(default="UTC", max_length=64, examples=["Europe/Berlin"])
    daily_goal_ml: int = Field(default=2500, ge=500, le=10_000)


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
