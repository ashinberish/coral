from datetime import UTC, date, datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from coral_api.modules.hydration.models import DrinkLog, DrinkType
from coral_api.modules.hydration.repository import DrinkLogRepository
from coral_api.modules.users.models import User
from coral_api.modules.users.repository import UserRepository

pytestmark = pytest.mark.db

TODAY = date(2026, 11, 8)


async def make_user(session: AsyncSession) -> User:
    return await UserRepository(session).add(User(timezone="Europe/Berlin"))


async def test_user_defaults(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    await db_session.refresh(user)
    assert user.daily_goal_ml == 2500
    assert user.created_at.tzinfo is not None


async def test_daily_total_and_ordering(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    repo = DrinkLogRepository(db_session)
    for hour, amount, kind in [(13, 250, DrinkType.WATER), (9, 200, DrinkType.COFFEE)]:
        await repo.add(
            DrinkLog(
                user_id=user.id,
                amount_ml=amount,
                drink_type=kind,
                logged_at=datetime(2026, 11, 8, hour, tzinfo=UTC),
                day_key=TODAY,
            )
        )
    await repo.add(
        DrinkLog(
            user_id=user.id,
            amount_ml=500,
            logged_at=datetime(2026, 11, 7, 20, tzinfo=UTC),
            day_key=date(2026, 11, 7),
        )
    )

    assert await repo.total_for_day(user.id, TODAY) == 450
    logs = await repo.for_day(user.id, TODAY)
    assert [log.amount_ml for log in logs] == [200, 250]
    assert logs[0].drink_type is DrinkType.COFFEE


@pytest.mark.parametrize("amount", [0, 5001])
async def test_amount_check_constraint(db_session: AsyncSession, amount: int) -> None:
    user = await make_user(db_session)
    db_session.add(
        DrinkLog(
            user_id=user.id,
            amount_ml=amount,
            logged_at=datetime(2026, 11, 8, tzinfo=UTC),
            day_key=TODAY,
        )
    )
    with pytest.raises(IntegrityError, match="ck_drink_logs_amount_range"):
        await db_session.flush()


async def test_deleting_user_cascades_logs(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    repo = DrinkLogRepository(db_session)
    await repo.add(
        DrinkLog(
            user_id=user.id,
            amount_ml=250,
            logged_at=datetime(2026, 11, 8, tzinfo=UTC),
            day_key=TODAY,
        )
    )
    await UserRepository(db_session).delete(user)
    db_session.expunge_all()
    assert await repo.total_for_day(user.id, TODAY) == 0
