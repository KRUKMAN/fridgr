# Wave 3 Smoke Sanity

`scripts/wave3Smoke.cjs` is the focused Wave 3 live sanity baseline.

It covers:

- Missing auth returns `401` on protected Wave 3 function families.
- Non-member household access returns `403` when smoke credentials and a household id are provided.
- Member access reaches the food catalog, fridge, and diary endpoint families without `401` or `403`.

Planned additions once the Wave 3 endpoints are implemented:

- Member happy-path create/search/list flows for food catalog, fridge, and diary.
- D-5 event checks for `FridgeItemAdded`, `FridgeItemConsumed`, `FridgeItemWasted`, `DiaryEntryCreated`, and `DiaryEntryCorrected`.
- Consume-with-diary atomicity proof.
- Diary correction append-only proof that the original row is unchanged.

Run with:

```powershell
$env:SUPABASE_FUNCTIONS_URL="https://<project>.functions.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY="<anon key>"
$env:SMOKE_MEMBER_EMAIL="<member smoke email>"
$env:SMOKE_MEMBER_PASSWORD="<member smoke password>"
$env:SMOKE_NON_MEMBER_EMAIL="<non-member smoke email>"
$env:SMOKE_NON_MEMBER_PASSWORD="<non-member smoke password>"
$env:SMOKE_HOUSEHOLD_ID="<known member household id>"
npm run smoke:wave3
```

Do not commit real credentials. Use environment variables only.
