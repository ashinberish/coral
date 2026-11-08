import pytest
from sqlalchemy import text

from coral_api.core.config import DatabaseSettings, Settings
from coral_api.db.session import Database

pytestmark = pytest.mark.db


async def test_pgbouncer_mode_connects_and_reuses_statements(
    migrated_db: str, settings: Settings
) -> None:
    """PgBouncer-safe connect args are accepted by asyncpg and queries still work.

    (Runs against plain Postgres; real PgBouncer behaviour is covered by the unique
    statement names + disabled caches asserted in the unit tests.)
    """
    db_settings = DatabaseSettings(
        dsn=settings.database.url.replace("+asyncpg", ""),  # type: ignore[arg-type]
        pgbouncer=True,
        pool_size=1,
        max_overflow=0,
    )
    database = Database(db_settings)
    try:
        async with database.engine.connect() as conn:
            for value in (1, 2, 3):  # same statement repeatedly on one connection
                result = await conn.execute(text("SELECT CAST(:v AS integer)"), {"v": value})
                assert result.scalar_one() == value
    finally:
        await database.dispose()
