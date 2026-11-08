# ADR 0001 — Single monorepo for mobile and backend

- Status: accepted
- Date: 2026-11-08

## Context
Coral has an Expo mobile app and a FastAPI backend that evolve together (API contract,
shared domain concepts such as day keys and streak rules).

## Decision
One repository with `apps/mobile` (pnpm workspace) and `apps/api` (uv project), shared
`infra/` and `docs/`, and per-app CI workflows filtered by path.

- JS tooling: pnpm workspaces (isolated installs; Expo SDK 58 supports them without Metro config).
- Python tooling: uv, managed independently inside `apps/api` (not part of the pnpm workspace).
- `packages/` hosts shared TS code; first planned package is a client generated from the
  API's OpenAPI schema (M2), so the contract is typed end to end.

## Consequences
- Atomic changes across app + API; one PR, one review.
- CI stays fast because workflows only run for the paths they own.
- Two toolchains (Node and Python) must be installed for full-stack work; `make setup` hides that.
