import uuid
from datetime import date, datetime, timedelta

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

from coral_api.core.errors import DomainValidationError
from coral_api.modules.hydration.models import DrinkType


class DrinkLogCreate(BaseModel):
    id: uuid.UUID | None = Field(
        default=None,
        description=(
            "Client-generated ID. Makes the request idempotent, so offline queues can retry "
            "safely: re-sending the same ID returns the existing log."
        ),
    )
    amount_ml: int = Field(ge=1, le=5000, examples=[250])
    drink_type: DrinkType = DrinkType.WATER
    logged_at: AwareDatetime
    day_key: date = Field(description="User-local calendar day the drink counts towards.")

    @model_validator(mode="after")
    def _day_key_near_logged_at(self) -> "DrinkLogCreate":
        # Local dates are at most ±14h away from UTC, i.e. one calendar day either side.
        utc_day = self.logged_at.astimezone().date()
        if abs((self.day_key - utc_day).days) > 1:
            raise ValueError("day_key must be within one day of logged_at")
        return self


class DrinkLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount_ml: int
    drink_type: DrinkType
    logged_at: datetime
    day_key: date
    created_at: datetime


class DaySummary(BaseModel):
    day_key: date
    total_ml: int
    drink_count: int


MAX_RANGE_DAYS = 400


def validate_range(from_day: date, to_day: date) -> None:
    if to_day < from_day:
        raise DomainValidationError("to_day must not be before from_day")
    if to_day - from_day > timedelta(days=MAX_RANGE_DAYS):
        raise DomainValidationError(f"Range may span at most {MAX_RANGE_DAYS} days")
