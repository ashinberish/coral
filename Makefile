.PHONY: setup infra-up infra-down api api-migrate api-check mobile mobile-check check

COMPOSE := docker compose -f infra/docker/compose.yaml

setup:
	pnpm install
	cd apps/api && uv sync

infra-up:
	$(COMPOSE) up -d

infra-down:
	$(COMPOSE) down

api:
	cd apps/api && uv run coral-api

api-migrate:
	cd apps/api && uv run alembic upgrade head

api-check:
	cd apps/api && uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest

mobile:
	pnpm --filter @coral/mobile start

mobile-check:
	pnpm --filter @coral/mobile lint
	pnpm --filter @coral/mobile typecheck
	pnpm --filter @coral/mobile test

check: api-check mobile-check
