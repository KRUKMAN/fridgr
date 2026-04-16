# Conventions - Fridgr

The single source of truth for naming and code-shape conventions in this repo. `AGENTS.md` summarizes the rules; this file gives the detailed reference.

## Quick Reference

| Layer              | Convention                   | Example                       |
| ------------------ | ---------------------------- | ----------------------------- |
| Component files    | `PascalCase.tsx`             | `FridgeItemCard.tsx`          |
| Utility files      | `camelCase.ts`               | `formatQuantity.ts`           |
| Hook files         | `useCamelCase.ts`            | `useFridgeStore.ts`           |
| Test files         | `*.test.ts` / `*.test.tsx`   | `formatQuantity.test.ts`      |
| Store names        | `useCamelCaseStore`          | `useInventoryStore`           |
| Types / interfaces | `PascalCase`                 | `FridgeItem`, `DiaryEntry`    |
| Constants          | `UPPER_SNAKE_CASE`           | `MAX_RETRY_COUNT`             |
| DB columns         | `snake_case`                 | `quantity_base`, `created_at` |
| API paths          | `kebab-case` under `api/v1/` | `/api/v1/fridge-items`        |
| Edge Functions     | `kebab-case`                 | `fridge-items`                |
| Events             | `PascalCase` verb phrase     | `FridgeItemAdded`             |
| Domain folders     | `kebab-case`                 | `serve-split/`                |

## Component files

Canonical pattern: `PascalCase.tsx`

Rationale: components are React view types, so PascalCase makes them easy to distinguish from helpers.

Example: `FridgeItemCard.tsx`

Counterexample: `fridgeItemCard.tsx`, `fridge-item-card.tsx`

## Utility files

Canonical pattern: `camelCase.ts`

Rationale: utility modules usually export functions, so file names should read like code identifiers.

Example: `formatQuantity.ts`

Counterexample: `FormatQuantity.ts`, `format-quantity.ts`

## Hook files

Canonical pattern: `useCamelCase.ts`

Rationale: the `use` prefix makes React hook intent obvious to humans and tooling.

Example: `useInventoryFilters.ts`

Counterexample: `inventoryFilters.ts`, `UseInventoryFilters.ts`

## Test files

Canonical pattern: `*.test.ts` or `*.test.tsx`

Rationale: colocated or discoverable tests need a predictable suffix for tooling and review.

Example: `env.test.ts`

Counterexample: `testEnv.ts`, `env.specfile.ts`

## Stores

Canonical pattern: `useCamelCaseStore`

Rationale: Zustand stores are consumed like hooks, so the name should reflect that usage.

Example: `useDiaryStore`

Counterexample: `DiaryStore`, `diaryStore`

## Types and interfaces

Canonical pattern: `PascalCase`

Rationale: type names should read as domain concepts, not variables.

Example: `DishBatch`

Counterexample: `dishBatch`, `dish_batch`

## Constants

Canonical pattern: `UPPER_SNAKE_CASE`

Rationale: constants should stand out from runtime variables and be easy to scan.

Example: `DEFAULT_SERVING_G`

Counterexample: `defaultServingG`, `DefaultServingG`

## Database columns

Canonical pattern: `snake_case`

Rationale: Postgres and Drizzle schemas stay easier to align when column names match SQL conventions directly.

Example: `quantity_base`, `base_unit`, `created_at`

Counterexample: `quantityBase`, `QuantityBase`

## API paths

Canonical pattern: `kebab-case` under `api/v1/`

Rationale: URL paths should be stable, readable, and not depend on JavaScript casing rules.

Example: `/api/v1/diary-entries`

Counterexample: `/api/v1/diaryEntries`, `/api/v1/DiaryEntries`

## Edge Functions

Canonical pattern: `kebab-case`

Rationale: function names should align with API families and deployment naming.

Example: `serve-split`

Counterexample: `serveSplit`, `ServeSplit`

## Events

Canonical pattern: `PascalCase` verb phrase

Rationale: event names should read as durable facts that happened in the system.

Canonical v1 examples:

- `PrivateInventoryItemAdded`
- `PrivateInventoryItemConsumed`
- `PrivateInventoryItemWasted`
- `InventoryTransferredToFridge`
- `FridgeItemAdded`
- `FridgeItemConsumed`
- `FridgeItemWasted`
- `DishBatchCreated`
- `RecipeTemplateSaved`
- `ServeSplitCreated`
- `ServeSplitCompleted`
- `ServeSplitExpired`
- `MealLogged`
- `ConflictResolved`

Counterexample: `private_inventory_item_added`, `addFridgeItem`

## Domain folders

Canonical pattern: `kebab-case`

Rationale: folder names should map cleanly to route-like scopes and avoid JS identifier assumptions.

Example: `serve-split/`

Counterexample: `serveSplit/`, `ServeSplit/`

## Import ordering

Canonical pattern:

1. external dependencies
2. path-aliased imports
3. relative imports

Alphabetize within each group.

Rationale: stable import ordering reduces noisy diffs and makes dependency boundaries visible.

Example: `react`, then `@/lib/env`, then `./helpers`

Counterexample: mixing relative and package imports in arbitrary order

## Path aliases

Canonical pattern: use configured aliases such as `@/`, `@components/`, `@domains/`, `@stores/`

Rationale: aliases make shared-module imports stable when files move.

Example: `@/lib/env`

Counterexample: deep relative chains like `../../../lib/env` when an alias exists

## Quantity model

Canonical pattern: store typed base units with the quantity

Rationale: explicit units prevent silent conversion bugs and keep client/server calculations aligned.

Example: `quantity_base INTEGER`, `base_unit TEXT` where `base_unit` is `mass_mg`, `volume_ml`, or `count_each`

Counterexample: storing `2.5` without unit context, or storing display-only strings as the source of truth

## Drizzle conventions

Canonical pattern:

- schema file at `src/lib/db/schema.ts`
- table names match Postgres tables
- column names stay `snake_case`
- generate changes with `drizzle-kit`
- commit shared SQL migrations to `supabase/migrations/`

Rationale: one mental model across local SQLite, Drizzle, and Supabase reduces schema drift and AI mistakes.

Example: local Drizzle schema mirrors a Postgres `fridge_items` table with `quantity_base` and `created_at`

Counterexample: camelCase columns in Drizzle while Postgres uses snake_case, or local-only migration files outside the shared migration flow
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
