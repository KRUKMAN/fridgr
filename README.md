# Fridgr

Mobile food-tracking app: macro diary, household fridge inventory,
AI-assisted capture, and meal tracking with partners.

## Tech Stack

- React Native + Expo (managed workflow)
- TypeScript (strict mode)
- Zustand (reactive state)
- expo-sqlite + Drizzle ORM
- MMKV (fast key-value storage)
- Supabase (Auth, Postgres, Realtime, Edge Functions, Storage)

## Getting Started

1. Clone the repo.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in your values.
4. Run `npx expo start`.

## Project Structure

See `src/domains/` for business domain modules:

- `catalog/` - global foods, personal foods, food variations
- `inventory/` - private inventory, household fridge
- `cooking/` - dish batches, recipe support, lineage
- `diary/` - macro diary, daily summaries
- `purchase/` - receipt parsing, purchase history
- `household/` - membership, invites, permissions
- `identity/` - auth, user profile
- `serve-split/` - meal sharing, portions
- `ai/` - AI orchestration, intent parsing
- `sync/` - offline queue, conflict resolution

## Environment Variables

See `.env.example` for all required variables.
`SUPABASE_SERVICE_ROLE_KEY` is backend-only and must never be included
in client builds.

## CI

The GitHub Actions pipeline runs `lint`, `typecheck`, `test`, and
`build`. It triggers on pull requests to `main` and `develop`, and on
pushes to `develop`.

Add CI environment variables through GitHub Actions secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SENTRY_DSN` (optional; CI warns if missing)
- `EXPO_TOKEN` (optional; used for EAS Build before falling back to
  `expo export`)

To debug failures, inspect the Actions tab:

- https://github.com/KRUKMAN/fridgr/actions

## Branching Strategy

Branching and merge rules are documented in [CONTRIBUTING.md](CONTRIBUTING.md).
Coding and workflow docs are documented in:

- [CONVENTIONS.md](CONVENTIONS.md)
- [docs/COMMIT_FORMAT.md](docs/COMMIT_FORMAT.md)
- [docs/TICKET_TO_CODE_GUIDE.md](docs/TICKET_TO_CODE_GUIDE.md)

## Branch Protection Validation Evidence

After creating a test PR that validates protection behavior, add the PR
link here.

- Test PR: `<add-link-here>`
- Test PR: `https://github.com/KRUKMAN/fridgr/pull/1`
