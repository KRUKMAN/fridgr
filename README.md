# Fridgr

Mobile food-tracking app: macro diary, household fridge inventory,
AI-assisted capture, and meal tracking with partners

## Tech Stack

- React Native + Expo (managed workflow)
- TypeScript (strict mode)
- Zustand (reactive state)
- WatermelonDB (offline-first SQLite ORM)
- MMKV (fast key-value storage)
- Supabase (Auth, Postgres, Realtime, Edge Functions, Storage)

## Getting Started

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your values
4. `npx expo start`

## Project Structure

See `src/domains/` for business domain modules:

- `catalog/` — Global foods, personal foods, food variations
- `inventory/` — Private inventory, household fridge
- `cooking/` — Dish batches, recipe templates
- `diary/` — Macro diary, daily summaries
- `purchase/` — Receipt parsing, purchase history
- `household/` — Membership, invites, permissions
- `identity/` — Auth, user profile
- `serve-split/` — Meal sharing, portions
- `ai/` — AI orchestration, intent parsing
- `sync/` — Offline queue, conflict resolution

## Environment Variables

See `.env.example` for all required variables.
⚠️ `SUPABASE_SERVICE_ROLE_KEY` is backend-only — never include in client builds.

## Branching Strategy

Branching and merge rules are documented in `CONTRIBUTING.md`, including:

- `main`, `develop`, `feature/*`, `hotfix/*`
- required PR flow
- agent rule: coding agents work only on `feature/*` branches
- required branch protections and review gates

## Branch Protection Validation Evidence

After creating a test PR that validates protection behavior, add the PR link here.

- Test PR: `<add-link-here>`
- Test PR: `https://github.com/KRUKMAN/fridgr/pull/1`
