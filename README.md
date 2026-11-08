# Coral

A playful hydration app with streaks: close your daily ring, keep your streak alive,
earn pearls and badges. Game-like UI, a 3D Apple-style icon, and no water drops anywhere.

## Monorepo

```
apps/
  mobile/        Expo SDK 58 app (React Native, TypeScript, Expo Router)
  api/           FastAPI + PostgreSQL backend (SQLAlchemy 2.1, Alembic, OpenTelemetry)
packages/        shared JS/TS packages (e.g. the generated API client — coming with M2)
infra/
  docker/        local stack: Postgres 18, OpenTelemetry Collector, Jaeger
  otel/          collector configuration
docs/
  PLAN.md        product + implementation plan (milestones)
  adr/           architecture decision records
  mockups/       approved HTML mockups (open coral-playful.html in a browser)
.github/         CI (per-app workflows), PR template, Dependabot
```

## Quick start

```bash
# prerequisites: Node 22 + pnpm 10, Python 3.13 + uv, Docker
make setup        # pnpm install + uv sync
make infra-up     # postgres, otel-collector, jaeger
make api-migrate  # alembic upgrade head
make api          # http://localhost:8000/docs
make mobile       # Expo dev server
```

Run every check: `make check`. See each app's README for details:
[apps/mobile](apps/mobile/README.md) · [apps/api](apps/api/README.md).

## Status

- **M0 Foundation** — monorepo, tooling, CI, backend foundation, local infra ✅
- **M1 Design system** — tokens, Nunito, chunky components, 3D icon, Today screen (demo data) ✅
- M2 Logging & Today (data) · M3 Streaks · M4 Quests/pearls/badges · M5 Reminders · M6 Onboarding & settings · M7 Polish

Details in [docs/PLAN.md](docs/PLAN.md).
