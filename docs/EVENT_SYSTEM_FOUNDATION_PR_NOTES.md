# Event System Foundation PR Notes

## Pre-merge verification

Before merging, run the DB-backed event integration tests in required mode:

```bash
npm run test:events:integration:required
```

This command fails if no real Postgres/Supabase DB is reachable, so it cannot pass via skipped tests alone.

Local options:

- Start local Supabase stack and use the default DB URL in the test.
- Or provide `FRIDGR_SUPABASE_DB_URL` to a reachable non-production DB.

## Scope note for reviewers

`.github/PULL_REQUEST_TEMPLATE.md` was modified before this branch's event-system work and is not part of this implementation change set.
