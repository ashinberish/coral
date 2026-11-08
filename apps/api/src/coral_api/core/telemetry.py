"""OpenTelemetry tracing + metrics.

Providers are created per application and passed explicitly to the
instrumentors, so tests can plug in in-memory exporters without touching
global state. When telemetry is enabled the providers are also registered
globally, so ``trace.get_tracer(__name__)`` works anywhere in the codebase.
"""

from dataclasses import dataclass, field

from fastapi import FastAPI
from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import MetricReader, PeriodicExportingMetricReader
from opentelemetry.sdk.resources import (
    DEPLOYMENT_ENVIRONMENT,
    SERVICE_NAME,
    SERVICE_VERSION,
    Resource,
)
from opentelemetry.sdk.trace import SpanProcessor, TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import ParentBasedTraceIdRatio
from sqlalchemy.ext.asyncio import AsyncEngine

from coral_api.core.config import Settings

# Health probes are high-volume noise in traces.
EXCLUDED_URLS = "healthz,readyz"


@dataclass
class Telemetry:
    tracer_provider: TracerProvider
    meter_provider: MeterProvider
    _instrumented_engines: list[AsyncEngine] = field(default_factory=list)

    def instrument_engine(self, engine: AsyncEngine) -> None:
        SQLAlchemyInstrumentor().instrument(
            engine=engine.sync_engine,
            tracer_provider=self.tracer_provider,
            meter_provider=self.meter_provider,
            enable_commenter=False,
            # The instrumentor's declared range stops at SQLAlchemy < 2.1, but the engine
            # event API it hooks is unchanged in 2.1 (see tests/integration/test_telemetry_db.py).
            skip_dep_check=True,
        )
        self._instrumented_engines.append(engine)

    def shutdown(self) -> None:
        # The instrumentor is a process-wide singleton that ignores repeat instrument()
        # calls, so release it with the app; the next app instance can then instrument.
        if self._instrumented_engines:
            SQLAlchemyInstrumentor().uninstrument()
            self._instrumented_engines.clear()
        self.tracer_provider.shutdown()
        self.meter_provider.shutdown()


def build_resource(settings: Settings) -> Resource:
    return Resource.create(
        {
            SERVICE_NAME: settings.telemetry.service_name,
            SERVICE_VERSION: settings.version,
            DEPLOYMENT_ENVIRONMENT: settings.env.value,
        }
    )


def setup_telemetry(
    app: FastAPI,
    settings: Settings,
    *,
    span_processors: list[SpanProcessor] | None = None,
    metric_readers: list[MetricReader] | None = None,
) -> Telemetry:
    """Create providers, wire exporters and instrument the FastAPI app.

    ``span_processors`` / ``metric_readers`` override the OTLP exporters (used by tests).
    """
    resource = build_resource(settings)
    cfg = settings.telemetry

    tracer_provider = TracerProvider(
        resource=resource, sampler=ParentBasedTraceIdRatio(cfg.sample_ratio)
    )
    if span_processors is None:
        span_processors = (
            [
                BatchSpanProcessor(
                    OTLPSpanExporter(endpoint=cfg.otlp_endpoint, insecure=cfg.otlp_insecure)
                )
            ]
            if cfg.enabled
            else []
        )
    for processor in span_processors:
        tracer_provider.add_span_processor(processor)

    if metric_readers is None:
        metric_readers = (
            [
                PeriodicExportingMetricReader(
                    OTLPMetricExporter(endpoint=cfg.otlp_endpoint, insecure=cfg.otlp_insecure),
                    export_interval_millis=cfg.metrics_export_interval_ms,
                )
            ]
            if cfg.enabled
            else []
        )
    meter_provider = MeterProvider(resource=resource, metric_readers=metric_readers)

    if cfg.enabled:
        trace.set_tracer_provider(tracer_provider)
        metrics.set_meter_provider(meter_provider)

    FastAPIInstrumentor.instrument_app(
        app,
        tracer_provider=tracer_provider,
        meter_provider=meter_provider,
        excluded_urls=EXCLUDED_URLS,
    )
    return Telemetry(tracer_provider=tracer_provider, meter_provider=meter_provider)
