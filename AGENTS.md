# AGENTS.md - Fridgr

Primary instructions for coding agents working in this repo. Keep this file concise, accurate, and aligned with the current codebase.

## Project overview

Fridgr is a React Native + Expo app for food tracking, shared household fridge management, diary logging, purchase capture, and AI-assisted food input.

Current stack:

- React Native + Expo managed workflow
- TypeScript strict mode
- Zustand for in-memory state
- expo-sqlite + Drizzle ORM for persistent local data
- MMKV for lightweight preferences/session storage
- Supabase for Auth, Postgres, Edge Functions, Storage, and Realtime

## Setup and verification

- Install: `npm install`
- Start: `npx expo start`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test`
- Format check when needed: `npm run format:check`

Done means:

- `npm run typecheck` passes
- `npm run lint` passes
- `npm test` passes
- no secrets are committed
- no `any` types are introduced
- docs are updated if repo rules or behavior changed

## Repo shape

Key paths:

- `src/domains/` - business domains such as `inventory`, `diary`, `cooking`, `serve-split`
- `src/lib/` - shared utilities and local infra such as env/db helpers
- `src/services/` - service clients and adapters
- `supabase/functions/` - Edge Functions
- `supabase/migrations/` - committed SQL migrations

Use the current repo structure as the source of truth. Do not reintroduce outdated folders or WatermelonDB-specific patterns.

## Architecture rules

Fridgr has 4 data classes that must stay separate:

1. Catalogs - what a thing is
2. Inventories - what currently exists
3. Produced outputs - what was cooked this time
4. Logs - what was eaten, wasted, or split

Never collapse these into one model. A food definition is not an inventory row. An inventory row is not a dish batch. A dish batch is not a reusable recipe.

Deterministic-first rules:

- prefer exact or rules-based resolution before AI matching
- every AI-assisted mutation ends in explicit confirmation
- AI failure must degrade to manual flows, never block core CRUD

## Code and data rules

- Expo managed workflow only; never eject
- TypeScript strict mode; `any` is forbidden
- Prefer named exports
- Prefer small, single-purpose functions
- Use path aliases where configured
- Follow naming and import rules in `CONVENTIONS.md`

Quantity model:

- store quantities as `quantity_base` plus `base_unit`
- `base_unit` is one of `mass_mg`, `volume_ml`, `count_each`
- never store operational quantities as implicit units or floats

Mutation rules:

- client writes go through Supabase Edge Functions, not direct table writes
- every mutation includes `operation_id` for idempotency
- same `operation_id` + same payload returns the original result
- same `operation_id` + different payload must be rejected

## Drizzle and local persistence

Use expo-sqlite + Drizzle ORM for local persistence:

- canonical local schema path: `src/lib/db/schema.ts`
- local schema should mirror Postgres table and column naming where practical
- database columns remain `snake_case`
- generate schema changes with `drizzle-kit`
- keep committed SQL migrations in `supabase/migrations/` for shared environments
- use `useLiveQuery` for reactive local reads
- use TanStack Query for server-state fetching/caching
- model offline writes through a `pending_mutations` table/queue instead of WatermelonDB sync primitives

Do not introduce WatermelonDB APIs, models, or migration patterns.

## Security rules

- never commit secrets, API keys, or real user data
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in client code, Edge Function responses, CI logs, fixtures, or prompts
- `.env` and `.env.local` must stay gitignored
- feature flags default to `false` in non-production environments
- treat staging as non-production: no real user data

## Workflow rules

- one ticket = one focused outcome
- one branch per ticket: `feature/<ticket-id>-<short-description>`
- one PR = one logical unit of work
- PR title format: `[Wave X] <ticket-title>`
- use `CONTRIBUTING.md` as the canonical source for commit-message and PR process rules
- use `TICKET_TO_CODE.md` as the canonical step-by-step implementation workflow

## Testing expectations

- prefer TDD for non-trivial work
- write unit tests for pure calculations/helpers
- write integration tests for API/database behavior where applicable
- do not claim success based only on compilation or agent confidence

## Escalate immediately if

- two source docs conflict
- the task needs a new table, entity, or API family
- security or privacy impact is unclear
- a destructive migration is proposed
- the task touches auth, deletion, billing, or household permissions
- acceptance criteria cannot be verified with available context

## References

- `CONVENTIONS.md` - detailed naming, import, event, and Drizzle conventions
- `TICKET_TO_CODE.md` - ticket execution workflow and anti-scope-creep guardrails
- `CONTRIBUTING.md` - branch, PR, and commit conventions
