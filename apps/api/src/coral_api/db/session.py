"""Async engine + session lifecycle.

One :class:`Database` per application (created in the lifespan). Request
handlers receive an ``AsyncSession`` through the ``SessionDep`` dependency;
the session commits on success and rolls back on any exception.
"""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from coral_api.core.config import DatabaseSettings


class Database:
    def __init__(self, settings: DatabaseSettings) -> None:
        self.engine: AsyncEngine = create_async_engine(
            settings.url,
            connect_args=settings.connect_args,
            echo=settings.echo,
            pool_size=settings.pool_size,
            max_overflow=settings.max_overflow,
            pool_timeout=settings.pool_timeout_s,
            pool_pre_ping=True,
        )
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)

    async def ping(self) -> None:
        async with self.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

    async def dispose(self) -> None:
        await self.engine.dispose()


def get_database(request: Request) -> Database:
    database: Database = request.app.state.database
    return database


async def get_session(
    database: Annotated[Database, Depends(get_database)],
) -> AsyncIterator[AsyncSession]:
    async with database.session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


DatabaseDep = Annotated[Database, Depends(get_database)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
