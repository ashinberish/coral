# syntax=docker/dockerfile:1
# ---- build: resolve and install dependencies with uv into /app/.venv
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev

# ---- runtime: slim image, non-root user, no build tooling
FROM python:3.13-slim-bookworm AS runtime
ENV PYTHONUNBUFFERED=1 PATH="/app/.venv/bin:$PATH" CORAL_LOG_FORMAT=json
RUN groupadd --system app && useradd --system --gid app --home /app app
WORKDIR /app
COPY --from=build --chown=app:app /app /app
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz')"
# Run migrations as a separate release step (e.g. `alembic upgrade head` job), not on boot.
CMD ["uvicorn", "coral_api.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
