import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from coral_api.core.errors import ConflictError
from coral_api.modules.hydration.models import DrinkLog
from coral_api.modules.hydration.repository import DrinkLogRepository
from coral_api.modules.hydration.schemas import DrinkLogCreate
from coral_api.modules.users.models import User


class HydrationService:
    def __init__(self, session: AsyncSession) -> None:
        self.logs = DrinkLogRepository(session)

    async def log_drink(self, user: User, body: DrinkLogCreate) -> DrinkLog:
        log = await self.logs.insert_if_absent(
            id_=body.id or uuid.uuid4(),
            user_id=user.id,
            amount_ml=body.amount_ml,
            drink_type=body.drink_type,
            logged_at=body.logged_at,
            day_key=body.day_key,
        )
        if log is None or log.user_id != user.id:
            # The id already belongs to someone else (UUID collision or a crafted request).
            raise ConflictError("A drink log with this id already exists")
        return log

    async def delete_drink(self, user: User, log_id: uuid.UUID) -> None:
        """Idempotent: deleting a missing (or foreign) log is a no-op, so sync can retry."""
        log = await self.logs.get(log_id)
        if log is not None and log.user_id == user.id:
            await self.logs.delete(log)
