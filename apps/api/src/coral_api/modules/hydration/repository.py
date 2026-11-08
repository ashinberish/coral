import uuid
from collections.abc import Sequence
from datetime import date

from sqlalchemy import func, select

from coral_api.db.repository import Repository
from coral_api.modules.hydration.models import DrinkLog


class DrinkLogRepository(Repository[DrinkLog]):
    model = DrinkLog

    async def for_day(self, user_id: uuid.UUID, day_key: date) -> Sequence[DrinkLog]:
        stmt = (
            select(DrinkLog)
            .where(DrinkLog.user_id == user_id, DrinkLog.day_key == day_key)
            .order_by(DrinkLog.logged_at)
        )
        return (await self.session.scalars(stmt)).all()

    async def total_for_day(self, user_id: uuid.UUID, day_key: date) -> int:
        stmt = select(func.coalesce(func.sum(DrinkLog.amount_ml), 0)).where(
            DrinkLog.user_id == user_id, DrinkLog.day_key == day_key
        )
        return int((await self.session.execute(stmt)).scalar_one())
