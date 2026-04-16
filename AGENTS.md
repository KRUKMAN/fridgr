# AGENTS.md - Fridgr

This file provides instructions and context for AI coding agents working
on the Fridgr codebase. It is read automatically by Codex and other
AGENTS.md-compatible tools.

## Project overview

Fridgr is a mobile food-tracking app: macro diary, household fridge inventory,
AI-assisted receipt/voice capture, and serve/split meal sharing.

Tech stack:

- React Native + Expo (managed workflow - never eject)
- TypeScript (strict mode)
- Zustand (reactive in-memory state)
- expo-sqlite + Drizzle ORM (offline-first local persistence)
- MMKV (fast key-value storage for preferences)
- Supabase (Auth, Postgres, Realtime, Edge Functions, Storage)

## Setup commands

- Install deps: `npm install`
- Start dev server: `npx expo start`
- Typecheck: `npm run typecheck` (must pass with zero errors)
- Lint: `npm run lint` (must pass with zero warnings)
- Format check: `npm run format:check`
- Run tests: `npm test`

## Project structure

```text
fridgr/
|- src/
|  |- components/ # Shared UI components
|  |- screens/ # Screen-level components
|  |- stores/ # Zustand stores (in-memory reactive state)
|  |- models/ # Local data models and persistence helpers
|  |- lib/ # Pure utilities, helpers, constants
|  |- hooks/ # Custom React hooks
|  |- types/ # Shared TypeScript type definitions
|  |- navigation/ # React Navigation setup
|  |- services/ # External service clients (Supabase, etc.)
|  `- domains/ # Business domain modules
|     |- catalog/ # Global foods, personal foods, food variations
|     |- inventory/ # Private inventory, household fridge, transfers
|     |- cooking/ # Dish batches, lineage, recipe support
|     |- diary/ # Diary entries, daily summaries, waste events
|     |- purchase/ # Receipt parsing, purchase history
|     |- household/ # Households, membership, invites, permissions
|     |- identity/ # Auth, user profile, session management
|     |- serve-split/ # Serve/split events, portions, accept/decline
|     |- ai/ # AI orchestration, intent parsing, confirmation
|     `- sync/ # Offline queue, sync adapter, conflict resolution
|- supabase/
|  |- functions/ # Supabase Edge Functions (Deno)
|  `- migrations/ # Database migrations
|- assets/ # Static assets
|- AGENTS.md # This file
|- CONVENTIONS.md # Naming and code conventions
`- docs/ # Workflow and process docs
```

### Domain architecture

The system has 4 data classes that must stay separate:

1. CATALOGS = what a thing IS (global foods, personal foods, food variations)
2. INVENTORIES = what currently EXISTS (private inventory, household fridge)
3. PRODUCED OUTPUTS = what was cooked THIS TIME (dish batches, lineage)
4. LOGS = what was eaten, wasted, or split (diary, waste, serve/split)

Never mix these. A food definition is not an inventory row. An inventory
row is not a dish batch. A dish batch is not a recipe template.

## Code style

- TypeScript strict mode - `any` is forbidden
- Prefer functional components with hooks
- Use Zustand for reactive state and Drizzle with expo-sqlite for persistence
- Use path aliases: `@/`, `@components/`, `@domains/`, etc.
- Prefer named exports over default exports
- Prefer `const` over `let`; never use `var`
- Use explicit return types on exported functions
- Keep functions small and single-purpose
- Prefer composition over inheritance

## Naming conventions

Repo naming and file conventions live in [CONVENTIONS.md](CONVENTIONS.md).
Use this file for the higher-level guardrails and architecture rules.

## Quantity model

All operational quantities use the typed base-unit pattern:

- `quantity_base: INTEGER` (never float)
- `base_unit: TEXT` where `base_unit` is one of `mass_mg`, `volume_ml`,
  or `count_each`
- Units are always stored alongside quantities - never implicit

## Mutation rules

- All writes go through Supabase Edge Functions - no direct client writes
- Every mutation request includes `operation_id: UUID` for idempotency
- Same `operation_id` plus same payload returns the original result
- Same `operation_id` plus different payload is rejected
- AI failure must degrade to manual mode, not block core CRUD

## Security rules

- `SUPABASE_SERVICE_ROLE_KEY` must never appear in:
  - client code
  - Edge Function responses
  - CI logs
  - agent prompts or conversations
- RLS is enabled by default - no table is publicly accessible
- `.env` and `.env.local` must be in `.gitignore`
- Feature flags default to false in non-production environments
- No real user data in dev or staging environments

## PR expectations

- Title format: `[domain] Short description` (example:
  `[inventory] Add fridge item CRUD`)
- One PR = one logical unit of work
- All checks must pass: typecheck, lint, test, build
- Include before and after notes or screenshots where applicable
- Link to the relevant task ticket
- Use [docs/COMMIT_FORMAT.md](docs/COMMIT_FORMAT.md) for commit messages
- Use [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)
  for pull requests

## Testing

- Prefer TDD: write tests first, then implementation
- Unit tests for pure calculations and conversion helpers
- Integration tests for API and database behavior
- Run relevant tests after every change: `npm test`
- Test code itself must be validated - correct assertions and adequate
  coverage
- If the only proof is "the agent says it works," the task is not done

## Constraints - DO NOT

- Do NOT eject from Expo managed workflow for any reason
- Do NOT use `any` type
- Do NOT commit secrets or API keys
- Do NOT write directly to Supabase tables from the client
- Do NOT create new database tables, entities, or API families without
  human approval
- Do NOT modify auth, billing, deletion, or household permission logic
  without review
- Do NOT mix data classes (catalogs != inventories != dish batches !=
  recipes)
- Do NOT auto-share personal foods - private by default
- Do NOT auto-promote user data to global catalog without verification
- Do NOT use inventory rows as master catalog rows
- Do NOT run destructive migrations without explicit approval

## Escalation - STOP AND REPORT IF

- Two source documents or specs conflict
- A new table, entity, or API family is needed
- Security or privacy impact is unclear
- A destructive migration is proposed
- The task touches auth, deletion, or household permissions
- Acceptance criteria cannot be tested with available context
- Drizzle, expo-sqlite, or another dependency is incompatible with Expo
  managed workflow

## Verification - "done" means

- `npm run typecheck` passes with zero errors
- `npm run lint` passes with zero warnings
- `npm test` passes - all relevant tests green
- No secrets committed
- No `any` types introduced
- PR title and description follow conventions
- Changes stay within the scope of the assigned task
- Edge cases and error paths are handled
