# Seed Notes

`global_food_items.sql` is a developer-only seed for local/dev database setup.

- Run it only after the food catalog tables exist.
- Keep staging clean by applying this file manually to dev/local only.
- Do not add this file to shared or staging seed automation in `supabase/config.toml`.
- The seed is idempotent via `WHERE NOT EXISTS` on `canonical_name` + `brand` + `barcode` because the current schema does not define a unique constraint on `global_food_items.canonical_name`.
