import uuid
from collections.abc import Sequence
from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from coral_api.db.repository import Repository
from coral_api.modules.hydration.models import DrinkLog, DrinkType


class DrinkLogRepository(Repository[DrinkLog]):
    model = DrinkLog

    async def insert_if_absent(
        self,
        *,
        id_: uuid.UUID,
        user_id: uuid.UUID,
        amount_ml: int,
        drink_type: DrinkType,
        logged_at: datetime,
        day_key: date,
    ) -> DrinkLog | None:
        """Insert unless a row with this id exists (race-safe). Returns the stored row."""
        stmt = (
            insert(DrinkLog)
            .values(
                id=id_,
                user_id=user_id,
                amount_ml=amount_ml,
                drink_type=drink_type,
                logged_at=logged_at,
                day_key=day_key,
            )
            .on_conflict_do_nothing(index_elements=[DrinkLog.id])
        )
        await self.session.execute(stmt)
        return await self.session.get(DrinkLog, id_, populate_existing=True)

    async def in_range(
        self, user_id: uuid.UUID, from_day: date, to_day: date
    ) -> Sequence[DrinkLog]:
        stmt = (
            select(DrinkLog)
            .where(
                DrinkLog.user_id == user_id,
                DrinkLog.day_key >= from_day,
                DrinkLog.day_key <= to_day,
            )
            .order_by(DrinkLog.logged_at, DrinkLog.id)
        )
        return (await self.session.scalars(stmt)).all()

    async def for_day(self, user_id: uuid.UUID, day_key: date) -> Sequence[DrinkLog]:
        return await self.in_range(user_id, day_key, day_key)

    async def total_for_day(self, user_id: uuid.UUID, day_key: date) -> int:
        stmt = select(func.coalesce(func.sum(DrinkLog.amount_ml), 0)).where(
            DrinkLog.user_id == user_id, DrinkLog.day_key == day_key
        )
        return int((await self.session.execute(stmt)).scalar_one())

    async def daily_totals(
        self, user_id: uuid.UUID, from_day: date, to_day: date
    ) -> Sequence[tuple[date, int, int]]:
        stmt = (
            select(DrinkLog.day_key, func.sum(DrinkLog.amount_ml), func.count())
            .where(
                DrinkLog.user_id == user_id,
                DrinkLog.day_key >= from_day,
                DrinkLog.day_key <= to_day,
            )
            .group_by(DrinkLog.day_key)
            .order_by(DrinkLog.day_key)
        )
        return [(d, int(total), int(count)) for d, total, count in await self.session.execute(stmt)]
