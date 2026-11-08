# Deploying the API to Vercel

The API (`apps/api`) runs as a Vercel Python function (FastAPI, Fluid compute). Production
deploys happen **from GitHub Actions** (`.github/workflows/api-deploy.yml`) on every merge to
`main` that touches `apps/api`:

```
checks (lint, mypy, tests vs Postgres, docker build)
  └─► migrate   alembic upgrade head   (direct / unpooled DB URL)
        └─► deploy    vercel pull → vercel build --prod → vercel deploy --prebuilt --prod
              └─► smoke     GET /healthz, /readyz, /v1/meta on API_BASE_URL
```

Vercel's own Git auto-deploys are disabled in `apps/api/vercel.json`, so a broken build or a
failed migration never reaches production. You can also run the workflow manually
(**Actions → api-deploy → Run workflow**).

## One-time setup

### 1. Create the Vercel project

From `apps/api` (leave the project's *Root Directory* setting empty, because the CLI runs inside `apps/api`):

```bash
cd apps/api
npx vercel@65 link        # create a new project, e.g. "coral-api"
cat .vercel/project.json  # → orgId and projectId (do not commit .vercel/)
```

### 2. Add Postgres (Neon)

Vercel Dashboard → project → **Storage / Marketplace → Neon → Create & connect** (enable it
for the *Production* environment). Neon injects connection variables into the project,
including `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).

- The app reads `DATABASE_URL` automatically. It converts the URL for asyncpg, keeps
  `sslmode=require`, and detects Neon's `-pooler` host to switch on PgBouncer-safe settings
  (prepared statements disabled).
- Migrations use the **unpooled** URL (see the GitHub secret below).

### 3. Project environment variables (Production)

| Name | Value |
|---|---|
| `CORAL_ENV` | `production` |
| `CORAL_LOG_FORMAT` | `json` |
| `CORAL_DATABASE__POOL_SIZE` | `3` |
| `CORAL_DATABASE__MAX_OVERFLOW` | `2` |
| `CORAL_CORS_ORIGINS` | comma-separated web origins, if any (native apps don't need CORS) |

Keep the pool small: under Fluid compute many instances run at once and each has its own pool;
Neon's pooler absorbs the fan-out. Telemetry stays off (`CORAL_TELEMETRY__ENABLED` unset);
Vercel's logs capture the JSON logs.

### 4. GitHub "production" environment

Repo → **Settings → Environments → New environment → `production`**. Optionally add
required reviewers to gate deploys.

| Kind | Name | Value |
|---|---|---|
| Secret | `VERCEL_TOKEN` | Vercel → Account Settings → Tokens (scope: your team) |
| Secret | `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| Secret | `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |
| Secret | `DATABASE_URL_UNPOOLED` | Neon's `DATABASE_URL_UNPOOLED` (Vercel project → Settings → Environment Variables) |
| Variable | `API_BASE_URL` | production domain, e.g. `https://coral-api.vercel.app` (enables the smoke test) |

The smoke test calls the **production domain**. Unique deployment URLs are behind Vercel
Deployment Protection by default and would return 401.

## Migration policy

Migrations run **before** the new code goes live, so the old code briefly runs against the new
schema. Keep every migration backward compatible (expand → deploy → contract):

- add nullable columns or columns with defaults, and add new tables freely;
- rename or drop in a *later* release, after the code no longer uses the old shape.

## Verifying a build locally

```bash
cd apps/api
mkdir -p .vercel && echo '{"projectId":"local","orgId":"local","settings":{"framework":"fastapi"}}' > .vercel/project.json
npx vercel@65 build --yes     # produces .vercel/output/functions/fastapi.func
rm -rf .vercel
```

The entrypoint is `[tool.vercel] entrypoint = "src.coral_api.asgi:app"` in `pyproject.toml`
(paths resolve from the project root, so the `src/` prefix is required; the package itself is
installed into the function's `_vendor/`).

`apps/api/.vercelignore` must only list files that git does **not** track (`.venv`, caches).
Vercel's Python builder walks the tracked file list, so ignoring a tracked file makes the
remote build fail with `ENOENT: no such file or directory, readlink '/vercel/path0/<file>'`.

## Troubleshooting

**`ModuleNotFoundError: No module named 'pydantic_core._pydantic_core'`** at runtime means the
bundle's compiled packages target a different Python than the function runtime. The Vercel CLI
uses the interpreter from `apps/api/.python-version` *only if it is on PATH*; otherwise it warns
`Python version "3.13" ... is not installed and will be ignored` and builds with another
version. The deploy workflow installs the exact version with `actions/setup-python` and runs
`scripts/verify_vercel_bundle.py` to block mismatched bundles. When building locally with
`--prebuilt`, make sure `python3.13` is installed, and build on Linux x86_64 (not macOS).

## Limits worth knowing

- Max duration 300 s by default (800 s on Pro); 4.5 MB request/response bodies.
- No WebSockets and no work after the response is sent; use Vercel Cron for scheduled jobs.
- Shutdown hooks get ~500 ms, so don't rely on them for flushing.

## Rollback

Vercel Dashboard → Deployments → previous production deployment → **Promote** (instant).
Because migrations are backward compatible, the database needs no rollback.
