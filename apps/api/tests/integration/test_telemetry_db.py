import pytest
from asgi_lifespan import LifespanManager
from fastapi import FastAPI
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from sqlalchemy import text

from coral_api.core.config import Settings
from coral_api.core.telemetry import setup_telemetry
from coral_api.db.session import Database
from coral_api.main import create_app

pytestmark = pytest.mark.db


async def test_db_spans_survive_previous_app_lifecycle(
    migrated_db: str, settings: Settings
) -> None:
    # A full app lifecycle first: instruments its engine, then releases it on shutdown.
    async with LifespanManager(create_app(settings)):
        pass

    exporter = InMemorySpanExporter()
    telemetry = setup_telemetry(
        FastAPI(), settings, span_processors=[SimpleSpanProcessor(exporter)], metric_readers=[]
    )
    database = Database(settings.database)
    telemetry.instrument_engine(database.engine)
    try:
        async with database.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    finally:
        await database.dispose()
        telemetry.shutdown()

    db_spans = [s for s in exporter.get_finished_spans() if s.kind.name == "CLIENT"]
    assert db_spans, "expected a CLIENT span for the SQL query"
    attrs = db_spans[-1].attributes or {}
    assert attrs.get("db.system") == "postgresql"
    assert "SELECT 1" in str(attrs.get("db.statement"))
