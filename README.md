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

## Running The Mobile App

Required client env vars:

- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The mobile app must never read `SUPABASE_SERVICE_ROLE_KEY`.

Recommended local flow:

1. Copy `.env.example` to `.env.local`.
2. Fill only the `EXPO_PUBLIC_*` values needed by the app shell.
3. Run `npm run start` for the Metro dev server.
4. Run `npm run ios`, `npm run android`, or `npm run web` for a target.
5. Use `npm run start:clear` if Expo Router caching gets in the way.

Current route scaffold:

- `app/(auth)` for unauthenticated flows
- `app/(app)` for authenticated flows
- root `app/_layout.tsx` for the global shell bootstrap

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

Client builds use only:

- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Staging Setup

Staging is wired through the Expo/EAS `preview` environment and the
`staging` build profile in `eas.json`.

Recommended setup:

1. For local development, copy `.env.example` to `.env.local` and fill
   in your development values.
2. For local testing against staging, pull the Expo `preview`
   environment into `.env.local` with
   `eas env:pull --environment preview`.
3. For remote staging builds, store `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` in Expo/EAS under the `preview`
   environment.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` only in backend surfaces such as
   local admin tooling, secure CI jobs, or Supabase-managed
   environments.
5. Build staging with `npx eas build --profile staging`.

## CI

The GitHub Actions pipeline runs `lint`, `typecheck`, `test`, and
`build`. It triggers on pull requests to `main` and `develop`, and on
pushes to `develop`.

Add CI environment variables through GitHub Actions secrets:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
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
