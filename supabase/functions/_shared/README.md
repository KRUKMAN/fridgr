# Fridgr Edge Functions Scaffold

This directory contains the shared building blocks for every Fridgr Edge
Function.

## Structure

- `middleware/`
  - `auth.ts`: verifies the bearer token, builds request context, and
    attaches `operation_id`
  - `householdGuard.ts`: checks that the authenticated user belongs to
    the target household
  - `idempotency.ts`: reserved for replay handling in a future wave
- `helpers/`
  - `response.ts`: standardized `ok()` / `err()` response envelope and
    CORS helpers
  - `validate.ts`: Zod request validation helpers
  - `eventEmitter.ts`: domain event insert helper for server-side
    writes
- `types/`
  - `context.ts`: shared request context types
  - `events.ts`: typed domain event envelope and payload map
  - `schemas/`: Zod request and event payload schemas
- `db/client.ts`
  - `getUserClient(jwt)`: request-scoped client using the caller's JWT
  - `getServiceClient()`: server-only client for trusted writes such as
    event emission

## Scaffold Pattern

Use the same pattern for every new endpoint:

1. Import `ok`, `err`, and `handleOptions` from `helpers/response.ts`.
2. Wrap the handler in `withAuth`.
3. Add `withHousehold(...)` when the route is scoped to a household.
4. Validate request bodies or query params with `validate(...)`.
5. Return responses only through `ok()` or `err()`.
6. Emit domain events only after a real mutation succeeds, using
   `emitEvent(...)`.

## Security Rules

- Never import `SUPABASE_SERVICE_ROLE_KEY` outside `db/client.ts`.
- Use the user-scoped client for authorization-sensitive reads.
- Echo the `operation_id` from the idempotency header in every response.
- Keep schemas strict. Extra fields should fail validation.

## Status

Wave 1 creates the scaffold and shared middleware/helpers.
Wave 2 will add real endpoint behavior on top of this foundation.
