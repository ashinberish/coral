"""Structured logging with structlog.

* Console renderer locally, JSON in deployed environments.
* Every record carries ``request_id`` (bound per request) and the active
  OpenTelemetry ``trace_id`` / ``span_id`` so logs and traces correlate.
* Standard-library loggers (uvicorn, sqlalchemy, alembic) are routed through
  the same pipeline.
"""

import logging
import sys

import structlog
from opentelemetry import trace
from structlog.types import EventDict, Processor, WrappedLogger

from coral_api.core.config import LogFormat, Settings


def _add_otel_context(_: WrappedLogger, __: str, event_dict: EventDict) -> EventDict:
    span_context = trace.get_current_span().get_span_context()
    if span_context.is_valid:
        event_dict["trace_id"] = format(span_context.trace_id, "032x")
        event_dict["span_id"] = format(span_context.span_id, "016x")
    return event_dict


def configure_logging(settings: Settings) -> None:
    shared: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _add_otel_context,
        structlog.processors.StackInfoRenderer(),
    ]

    renderer: Processor
    if settings.log_format is LogFormat.JSON:
        shared.append(structlog.processors.format_exc_info)
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=[*shared, structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared,
        processors=[structlog.stdlib.ProcessorFormatter.remove_processors_meta, renderer],
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(settings.log_level.upper())

    # Uvicorn installs its own handlers; let records propagate to ours instead.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True
    # Access logs are replaced by our request-logging middleware.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.stdlib.get_logger(name)
