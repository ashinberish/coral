# ADR 0002 — Backend stack and structure

- Status: accepted
- Date: 2026-11-08

## Decision
- **FastAPI** (async) with **Pydantic v2** schemas; app factory `create_app(settings)`.
- **pydantic-settings** for typed config: `CORAL_*` env vars, nested groups via `__`.
- **PostgreSQL 18** via **SQLAlchemy 2.1** async (asyncpg); session per request that commits on
  success and rolls back on error.
- **Alembic** async environment reusing app settings; constraint naming conventions for stable
  migrations; `alembic check` runs in tests so model drift fails CI.
- **OpenTelemetry** traces + metrics exported over OTLP to a Collector (Jaeger locally).
  Providers are per app (no hidden global state in tests). SQLAlchemy instrumentation is
  enabled with `skip_dep_check` because the instrumentor's declared range predates 2.1; a test
  guards that DB spans are still produced.
- **structlog** JSON logs carrying `request_id`, `trace_id`, `span_id`.
- **RFC 9457** problem+json for every error; internals are never leaked.
- Vertical slices: `modules/<feature>/{models,schemas,repository,service,router}.py`, with
  cross-cutting code in `core/` and persistence plumbing in `db/`.

## Consequences
- Migrations run as a separate release step (not on container boot).
- Integration tests need a real Postgres (CI service container); they skip locally when absent.
