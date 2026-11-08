import httpx
from fastapi import FastAPI
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from coral_api.core.config import Settings
from coral_api.core.telemetry import setup_telemetry


async def test_requests_produce_spans_and_probes_are_excluded(settings: Settings) -> None:
    app = FastAPI()

    @app.get("/v1/things/{thing_id}")
    async def thing(thing_id: int) -> dict[str, int]:
        return {"id": thing_id}

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    exporter = InMemorySpanExporter()
    telemetry = setup_telemetry(
        app, settings, span_processors=[SimpleSpanProcessor(exporter)], metric_readers=[]
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        await client.get("/v1/things/7")
        await client.get("/healthz")

    server_spans = [s for s in exporter.get_finished_spans() if s.kind.name == "SERVER"]
    assert [s.name for s in server_spans] == ["GET /v1/things/{thing_id}"]
    attrs = server_spans[0].attributes or {}
    assert attrs.get("http.route") == "/v1/things/{thing_id}"
    assert server_spans[0].resource.attributes["service.name"] == "coral-api"
    telemetry.shutdown()
