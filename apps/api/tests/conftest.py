"""Shared fixtures.

Integration tests use the database configured by the normal ``CORAL_DATABASE__*``
variables (point them at a disposable database!). When it is unreachable those
tests are skipped locally, and fail in CI (``CORAL_TEST_REQUIRE_DB=1``).
"""

import asyncio
import os
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import httpx
import pytest
from alembic import command
from alembic.config import Config
from asgi_lifespan import LifespanManager
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from coral_api.core.config import Environment, Settings
from coral_api.main import create_app

API_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings(_env_file=None, env=Environment.TEST, log_level="WARNING")


def _db_reachable(url: str) -> bool:
    async def ping() -> None:
        engine = create_async_engine(url)
        try:
            async with engine.connect():
                pass
        finally:
            await engine.dispose()

    try:
        asyncio.run(asyncio.wait_for(ping(), timeout=3))
    except Exception:  # noqa: BLE001
        return False
    return True


def alembic_config(url: str) -> Config:
    cfg = Config(str(API_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(API_ROOT / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    cfg.attributes["configure_logger"] = False
    return cfg


@pytest.fixture(scope="session")
def migrated_db(settings: Settings) -> Iterator[str]:
    """Upgrade the test database to head once per session; downgrade at the end."""
    url = settings.database.url
    if not _db_reachable(url):
        if os.environ.get("CORAL_TEST_REQUIRE_DB") == "1":
            pytest.fail(f"Database not reachable at {settings.database.host}")
        pytest.skip("PostgreSQL not reachable; set CORAL_DATABASE__* to run integration tests")
    cfg = alembic_config(url)
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield url
    command.downgrade(cfg, "base")


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    """Client without lifespan: for tests that never touch the database."""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
async def live_client(migrated_db: str, app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    """Client with the full lifespan (database engine, telemetry)."""
    async with (
        LifespanManager(app) as manager,
        httpx.AsyncClient(
            transport=httpx.ASGITransport(app=manager.app), base_url="http://test"
        ) as c,
    ):
        yield c


@pytest.fixture
async def db_session(migrated_db: str) -> AsyncIterator[AsyncSession]:
    """A session wrapped in an outer transaction that is always rolled back."""
    engine = create_async_engine(migrated_db)
    async with engine.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(bind=conn, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()
    await engine.dispose()
