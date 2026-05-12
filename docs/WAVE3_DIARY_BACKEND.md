# Wave 3 Diary Backend

This document records the Wave 3 diary backend decisions so future tickets keep
the write path secure and consistent.

## Decision: transactional diary RPCs

Diary mutations use database RPCs for the full write transaction:

- `public.create_diary_entry_transaction`
- `public.correct_diary_entry_transaction`

The Edge Function still authenticates the Supabase JWT, validates the request,
and checks household membership for create requests before calling the RPC. The
RPCs are granted only to `service_role`, so they are backend-only and must not
be called from the mobile client.

Each RPC performs these steps in one Postgres transaction:

- serializes the idempotency key with an advisory transaction lock
- checks `idempotency_keys`
- writes append-only `diary_entries`
- recomputes `daily_summaries`
- inserts the D-5 domain event
- stores the final response envelope for safe replay

This is intentional. The previous sequential Edge Function flow could create a
diary entry but fail before updating the summary or event log.

## Decision: replacement-style corrections

The public correction API accepts a replacement entry:

```json
{
  "reason": "Wrong quantity",
  "replacement": {
    "food_name": "Greek yogurt",
    "quantity_base": 150000,
    "base_unit": "mass_mg",
    "kcal": 180,
    "protein_mg": 15000,
    "carbs_mg": 9000,
    "fat_mg": 4000,
    "source_scope": "global",
    "source_id": "uuid"
  }
}
```

Internally this remains append-only:

- the original diary row is never mutated
- a correction row cancels the original macros with negative values
- a replacement row records the corrected values
- `DiaryEntryCorrected` stores the net macro delta
- summaries and list responses include only client-visible rows, which means
  correction rows and corrected originals stay internal

This keeps the client and AI flows simple while preserving an audit trail.

## Security notes

- The backend service key remains confined to
  `supabase/functions/_shared/db/client.ts`.
- The mobile app must call only the Edge Function endpoints.
- Direct authenticated inserts into `diary_entries` and `idempotency_keys` are
  disabled. Writes go through Edge Functions and service-role RPCs only.
- The RPCs include database-side membership and source ownership checks as
  defense in depth, but Edge Function auth remains the public boundary.
- `daily_summaries` is keyed by `user_id,date`, so mutation RPCs recompute the
  whole user-day summary rather than a household-filtered summary.

## Known follow-up

Date semantics are still UTC-day based for summary recompute and list queries.
If Fridgr later stores a user timezone or diary-local date column, update the
RPCs and `GET /diary/*` queries together.
