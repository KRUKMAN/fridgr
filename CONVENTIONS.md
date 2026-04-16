# Fridgr Conventions

This document is the naming and code convention reference for the repo.
Use it together with [AGENTS.md](AGENTS.md),
[docs/COMMIT_FORMAT.md](docs/COMMIT_FORMAT.md), and
[docs/TICKET_TO_CODE_GUIDE.md](docs/TICKET_TO_CODE_GUIDE.md).

## Components

- Use PascalCase filenames such as `FridgeItemCard.tsx`.
- Use PascalCase component names.
- Keep one component per file. Co-located styles are OK.
- Use functional components only. Do not add class components.

## Hooks

- Use `useCamelCase` names such as `useFridgeStore.ts` and
  `useDiaryEntry.ts`.
- Every hook must start with the `use` prefix.
- Put shared custom hooks in `src/hooks/`.
- Domain-specific hooks may be co-located inside the relevant domain.

## Utilities

- Use `camelCase.ts` filenames such as `formatQuantity.ts` and
  `parseReceipt.ts`.
- Prefer pure functions with explicit inputs and outputs.
- Add explicit return types to all exported functions.

## Zustand Stores

- Use `useCamelCaseStore` names such as `useDiaryStore.ts` and
  `useInventoryStore.ts`.
- Put store files in `src/stores/`.
- Keep one store per domain concern.

## Database Columns

- Use `snake_case` for Postgres and Drizzle column names such as
  `quantity_base`, `base_unit`, `created_at`, and `updated_at`.
- Keep Drizzle schema definitions aligned exactly with Postgres names.
- Use the same `snake_case` names for local SQLite tables.

## API Paths

- Use `kebab-case` for Edge Function paths such as `/ai-capture`,
  `/diary-entry`, and `/fridge-sync`.
- Add explicit version prefixes only when needed, for example
  `/v1/ai-capture`.

## Edge Function Naming

- Use `kebab-case` directory names in `supabase/functions/`.
- Use `index.ts` as the Deno entry file.

## Event Naming

- Use a PascalCase domain prefix plus a past-tense verb, such as
  `Inventory.ItemAdded`, `Diary.EntryLogged`, and
  `Cooking.BatchCreated`.
- Use the standard event envelope:

```ts
{
  event_type,
  payload,
  operation_id,
  emitted_at,
}
```

## Import Ordering

1. React and React Native imports
2. Third-party library imports
3. Path alias imports such as `@/`
4. Relative imports
5. Type-only imports last

## File Organization

- Co-locate tests next to the file they cover, for example
  `Component.test.tsx` next to `Component.tsx`.
- Co-locate types when they are specific to a single domain.
- Put shared types in `src/types/`.
