"""Alembic environment (async, asyncpg).

The database URL comes from ``coral_api`` settings, so migrations use exactly
the same configuration as the application (``CORAL_DATABASE__*``).
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from coral_api.core.config import get_settings
from coral_api.db.models import Base

config = context.config

if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

# Callers (e.g. tests) may inject a URL; otherwise use the app's database settings,
# including asyncpg connect args (SSL, PgBouncer-safe prepared statements).
# In deployed environments point this at the *direct* (unpooled) connection.
_injected_url = config.get_main_option("sqlalchemy.url")
_db = get_settings().database
DATABASE_URL = _injected_url or _db.url
CONNECT_ARGS = {} if _injected_url else _db.connect_args

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout without a DB connection (``alembic upgrade head --sql``)."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(
        DATABASE_URL, poolclass=pool.NullPool, connect_args=CONNECT_ARGS
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    connection: Connection | None = config.attributes.get("connection")
    if connection is not None:  # programmatic use with an existing connection
        do_run_migrations(connection)
    else:
        asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
