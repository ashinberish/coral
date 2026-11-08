# Coral — product & implementation plan

Coral is a playful hydration app: log drinks, close your daily ring, keep your streak.
Game-like UI (chunky buttons, quests, pearls, badges), a 3D Apple-style icon, and a hard
design rule: **no water drops anywhere**. Gradients are allowed only in the app icon.

Approved mockup: [`mockups/coral-playful.html`](mockups/coral-playful.html).

## Architecture

| Layer | Choice |
|---|---|
| Mobile | Expo SDK 58, Expo Router, TypeScript strict, Reanimated 4, react-native-svg, expo-haptics, Nunito |
| Local data (M2) | expo-sqlite for drink logs, zustand (persisted) for settings / wallet / badges |
| Backend | FastAPI, Pydantic v2, pydantic-settings, SQLAlchemy 2.1 async + asyncpg, Alembic |
| Database | PostgreSQL 18 |
| Observability | OpenTelemetry (OTLP → Collector → Jaeger locally), structlog JSON logs |
| CI | GitHub Actions per app; Postgres service container for API integration tests |

The app is **offline-first**: everything works on-device; the API adds accounts, sync and
backup (M2+). See [ADR 0001](adr/0001-monorepo.md) and [ADR 0002](adr/0002-backend-stack.md).

## Domain model

```
User      { id, display_name, timezone, daily_goal_ml }
DrinkLog  { id, user_id, amount_ml, drink_type, logged_at, day_key }   // day_key = user-local date
Day       { day_key, goal_ml, total_ml, status: met|frozen|missed|open }  (derived)
Wallet    { pearls, freezes ≤ 2 }
Quest     { id, day_key, kind, target, progress, reward }
Badge     { id, unlocked_at?, level? }
```

`day_key` is fixed when a drink is logged, so streaks survive travel and DST changes.

## Game rules

- **Streak**: count back from today while days are `met` or `frozen`; today counts once the ring closes.
  On app open, unsettled past days are resolved (a missed day consumes a freeze if available).
- **Pearls**: +20 for closing the ring, +5–10 per quest, milestone bonuses. A freeze costs 200.
- **Quests**: 2–3 per day, deterministically picked from a pool by date seed.
- **Badges**: rule-based (First Glass, 7/30/100-day streak, Early Bird, 10 Liters, Perfect Week, Saved by Ice…).

## Milestones

| # | Scope | Done when |
|---|---|---|
| **M0** ✅ | Monorepo, tooling, CI, backend foundation (settings, DB, migrations, telemetry, errors, health), local infra, docs | All checks green in CI |
| **M1** ✅ | Design tokens, Nunito, ChunkyButton/Tile/Bubble/ProgressBar/Ring/StatPill/Medal/TabBar, icon set, 3D icon + splash, Today screen on demo data, `/design` style guide | Today matches the mockup |
| M2 | Local DB + store; Today wired to real logs; custom amount sheet; API: users + drink-log endpoints, generated TS client | Logs persist across restarts |
| M3 | Streak engine (unit-tested incl. DST/timezones), Streak screen, "Ring closed" celebration | Streak maths tested |
| M4 | Pearls, quests, badges, freeze shop, Badges screen | Rewards correct |
| M5 | Reminders: permission flow, scheduling in waking hours, Smart Skip, streak-at-risk, log from notification | Works on a dev build |
| M6 | Onboarding (goal from weight/activity), Reminders/Settings tab | Fresh install → working Today |
| M7 | Polish: animations, sounds, reduced motion, VoiceOver, Dynamic Type, dark mode | Ready for TestFlight |

Later: widgets, Apple Health sync, Live Activity.
