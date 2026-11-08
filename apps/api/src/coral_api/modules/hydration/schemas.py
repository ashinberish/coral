import uuid
from datetime import date, datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from coral_api.modules.hydration.models import DrinkType


class DrinkLogCreate(BaseModel):
    amount_ml: int = Field(ge=1, le=5000, examples=[250])
    drink_type: DrinkType = DrinkType.WATER
    logged_at: AwareDatetime
    day_key: date = Field(description="User-local calendar day the drink counts towards.")


class DrinkLogRead(DrinkLogCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    logged_at: datetime
    created_at: datetime
