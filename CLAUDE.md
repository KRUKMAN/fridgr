# CLAUDE.md — Fridgr Agent Guide

This file is the primary context file for Claude Code and AI coding agents.
Read it fully before touching any code.

## Project overview

Fridgr is a mobile food-tracking app: macro diary, household fridge inventory,
AI-assisted receipt/voice capture, and serve/split meal sharing.

Tech stack:

- React Native + Expo (managed workflow — never eject)
- TypeScript (strict mode)
- Zustand (reactive in-memory state)
- expo-sqlite + Drizzle ORM (offline-first local persistence)
- MMKV (fast key-value storage for preferences)
- Supabase (Auth, Postgres, Realtime, Edge Functions, Storage)

## Current focus

Active wave: **Wave 3 — manual entry + diary backend.**

Wave 3 adds food catalog CRUD, fridge item mutations, diary entries
(transactional RPC-backed), and diary corrections. The diary backend design is
documented in [docs/WAVE3_DIARY_BACKEND.md](docs/WAVE3_DIARY_BACKEND.md).

For the full task board and wave breakdown see [docs/NOTION.md](docs/NOTION.md).

## Setup commands

- Install deps: `npm install`
- Start dev server: `npx expo start`
- Typecheck: `npm run typecheck` (must pass with zero errors)
- Lint: `npm run lint` (must pass with zero warnings)
- Format check: `npm run format:check`
- Run tests: `npm test`

## Scripts

| Command                        | File                                | When to run                                                                       |
| ------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------- |
| `npm run verify:function-auth` | `scripts/verifyEdgeAuthImports.cjs` | Before every push — confirms all non-public Edge Functions use `withAuth`         |
| `npm run smoke:wave3`          | `scripts/wave3Smoke.cjs`            | Manual only — live HTTP smoke tests; requires env vars, see `docs/WAVE3_SMOKE.md` |
| _(CI only)_                    | `scripts/validateCiEnv.cjs`         | Run by CI pipeline; validates `EXPO_PUBLIC_*` env vars are present                |

## Project structure

```text
fridgr/
├── CLAUDE.md                          # This file — primary agent guide
├── AGENTS.md                          # Codex-compatible alias → points here
├── CONTRIBUTING.md                    # Branch model, PR process
├── CONVENTIONS.md                     # Naming and code conventions
├── README.md                          # Human-facing project overview
├── .github/1
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/ci.yml
├── docs/
│   ├── COMMIT_FORMAT.md               # Conventional commit rules
│   ├── TICKET_TO_CODE_GUIDE.md        # Full ticket-to-code workflow
│   ├── BRANCH_PROTECTION_SETUP.md     # Branch protection runbook
│   ├── WAVE3_DIARY_BACKEND.md         # ADR: diary backend transaction design
│   └── WAVE3_SMOKE.md                 # Wave 3 smoke test guide
├── src/
│   ├── components/                    # Shared UI components
│   ├── screens/                       # Screen-level components
│   ├── stores/                        # Zustand stores
│   ├── models/                        # Local data models and persistence helpers
│   ├── lib/                           # Pure utilities, helpers, constants
│   ├── hooks/                         # Custom React hooks
│   ├── types/                         # Shared TypeScript type definitions
│   ├── navigation/                    # React Navigation setup
│   ├── services/                      # External service clients (Supabase, etc.)
│   └── domains/                       # Business domain modules
│       ├── catalog/                   # Global foods, personal foods, food variations
│       ├── inventory/                 # Private inventory, household fridge, transfers
│       ├── cooking/                   # Dish batches, lineage, recipe support
│       ├── diary/                     # Diary entries, daily summaries, waste events
│       ├── purchase/                  # Receipt parsing, purchase history
│       ├── household/                 # Households, membership, invites, permissions
│       ├── identity/                  # Auth, user profile, session management
│       ├── serve-split/               # Serve/split events, portions, accept/decline
│       ├── ai/                        # AI orchestration, intent parsing, confirmation
│       └── sync/                      # Offline queue, sync adapter, conflict resolution
├── supabase/
│   ├── functions/                     # Supabase Edge Functions (Deno/TypeScript)
│   └── migrations/                    # Postgres migrations (append-only)
└── assets/                            # Static assets
```

## Domain architecture

The system has 4 data classes that must stay strictly separate:

1. **CATALOGS** — what a thing IS (global foods, personal foods, food variations)
2. **INVENTORIES** — what currently EXISTS (private inventory, household fridge)
3. **PRODUCED OUTPUTS** — what was cooked THIS TIME (dish batches, lineage)
4. **LOGS** — what was eaten, wasted, or split (diary, waste, serve/split)

Never mix these. A food definition is not an inventory row. An inventory row
is not a dish batch. A dish batch is not a recipe template.

## Supabase Edge Functions

All server-side logic lives in `supabase/functions/`. Each function is a
Deno TypeScript module with `supabase/functions/<name>/index.ts` as entry.

Rules:

- Shared utilities go in `supabase/functions/_shared/`
- The Supabase service client lives in `supabase/functions/_shared/db/client.ts`
- All functions authenticate the Supabase JWT before doing any work
- Household membership is checked inside Edge Functions — not on the client
- RPCs called from Edge Functions are granted to `service_role` only
- The service role key must never appear in client code or CI logs

## Code style

- TypeScript strict mode — `any` is forbidden
- Prefer functional components with hooks
- Use Zustand for reactive state and Drizzle with expo-sqlite for persistence
- Use path aliases: `@/`, `@components/`, `@domains/`, etc.
- Prefer named exports over default exports
- Prefer `const` over `let`; never use `var`
- Use explicit return types on exported functions
- Keep functions small and single-purpose
- Prefer composition over inheritance

## Naming conventions

Full naming and file conventions are in [CONVENTIONS.md](CONVENTIONS.md).
Key rules at a glance:

- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Zustand stores: `useCamelCaseStore.ts` in `src/stores/`
- Postgres/Drizzle columns: `snake_case`
- Edge Function paths: `kebab-case`
- Events: `Domain.PastTenseVerb` (e.g. `Diary.EntryCreated`)

## Quantity model

All operational quantities use the typed base-unit pattern:

- `quantity_base: INTEGER` (never float)
- `base_unit: TEXT` — one of `mass_mg`, `volume_ml`, or `count_each`
- Units are always stored alongside quantities — never implicit

## Mutation rules

- All writes go through Supabase Edge Functions — no direct client writes to Postgres
- Every mutation request includes `operation_id: UUID` for idempotency
- Same `operation_id` + same payload returns the original result
- Same `operation_id` + different payload is rejected
- AI failure must degrade to manual mode, not block core CRUD

## Security rules

- `SUPABASE_SERVICE_ROLE_KEY` must never appear in client code, Edge Function
  responses, CI logs, or agent prompts
- RLS is enabled by default — no table is publicly accessible
- `.env` and `.env.local` must remain in `.gitignore`
- Feature flags default to false in non-production environments
- No real user data in dev or staging environments

## Notion workspace

All contracts, the task board, and delivery process live in Notion.
The Notion MCP is connected — fetch pages directly by ID rather than guessing.
See [docs/NOTION.md](docs/NOTION.md) for a map of every key page and URL.

## PR expectations

- Title format: `[domain] Short description` (e.g. `[inventory] Add fridge item CRUD`)
- One PR = one logical unit of work
- All checks must pass: typecheck, lint, test, build
- Include before/after notes or screenshots where applicable
- Link to the relevant task ticket
- Commit messages follow [docs/COMMIT_FORMAT.md](docs/COMMIT_FORMAT.md)
- PR description follows [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)

## Testing

- Prefer TDD: write tests first, then implementation
- Unit tests for pure calculations and conversion helpers
- Integration tests for API and database behavior
- Run relevant tests after every change: `npm test`
- If the only proof is "the agent says it works," the task is not done

## Constraints — DO NOT

- Do NOT eject from Expo managed workflow for any reason
- Do NOT use `any` type
- Do NOT commit secrets or API keys
- Do NOT write directly to Supabase tables from the client
- Do NOT create new database tables, entities, or API families without human approval
- Do NOT modify auth, billing, deletion, or household permission logic without review
- Do NOT mix data classes (catalogs ≠ inventories ≠ dish batches ≠ recipes)
- Do NOT auto-share personal foods — private by default
- Do NOT auto-promote user data to global catalog without verification
- Do NOT use inventory rows as master catalog rows
- Do NOT run destructive migrations without explicit approval

## Escalation — STOP AND REPORT IF

- Two source documents or specs conflict
- A new table, entity, or API family is needed
- Security or privacy impact is unclear
- A destructive migration is proposed
- The task touches auth, deletion, or household permissions
- Acceptance criteria cannot be tested with available context
- Drizzle, expo-sqlite, or another dependency is incompatible with Expo managed workflow

## Definition of done

- `npm run typecheck` passes with zero errors
- `npm run lint` passes with zero warnings
- `npm test` passes — all relevant tests green
- No secrets committed
- No `any` types introduced
- PR title and description follow conventions
- Changes stay within the scope of the assigned task
- Edge cases and error paths are handled
