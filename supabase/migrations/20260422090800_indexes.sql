-- Wave E performance indexes.
-- Depends on the prior table-creation migrations already being applied.
-- CREATE INDEX CONCURRENTLY is intentionally avoided because standard
-- migration execution wraps statements in a transaction and these tables are
-- still fresh.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS global_food_items_canonical_name_trgm_idx
ON public.global_food_items
USING gin (canonical_name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS global_food_items_barcode_not_null_idx
ON public.global_food_items (barcode)
WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS global_food_items_category_idx
ON public.global_food_items (category);

CREATE INDEX IF NOT EXISTS global_food_items_source_type_idx
ON public.global_food_items (source_type);

CREATE INDEX IF NOT EXISTS global_food_submissions_verification_status_idx
ON public.global_food_submissions (verification_status);

CREATE INDEX IF NOT EXISTS food_variations_canonical_food_id_not_null_idx
ON public.food_variations (canonical_food_id)
WHERE canonical_food_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS food_variations_household_id_not_null_idx
ON public.food_variations (household_id)
WHERE household_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS food_variations_name_trgm_idx
ON public.food_variations
USING gin (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS food_variations_status_idx
ON public.food_variations (status);

CREATE INDEX IF NOT EXISTS food_variations_created_by_idx
ON public.food_variations (created_by);

CREATE INDEX IF NOT EXISTS personal_food_items_user_id_active_idx
ON public.personal_food_items (user_id)
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS personal_food_items_name_trgm_idx
ON public.personal_food_items
USING gin (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS private_inventory_items_user_household_active_idx
ON public.private_inventory_items (user_id, household_id)
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS private_inventory_items_estimated_expiry_idx
ON public.private_inventory_items (estimated_expiry)
WHERE estimated_expiry IS NOT NULL;

CREATE INDEX IF NOT EXISTS household_food_items_household_id_active_idx
ON public.household_food_items (household_id)
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS household_food_items_name_trgm_idx
ON public.household_food_items
USING gin (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS fridge_items_household_id_active_idx
ON public.fridge_items (household_id)
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS fridge_items_estimated_expiry_idx
ON public.fridge_items (estimated_expiry)
WHERE estimated_expiry IS NOT NULL;

CREATE INDEX IF NOT EXISTS fridge_items_dish_batch_id_not_null_idx
ON public.fridge_items (dish_batch_id)
WHERE dish_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS recipe_templates_owner_user_id_idx
ON public.recipe_templates (owner_user_id);

CREATE INDEX IF NOT EXISTS recipe_templates_owner_household_id_idx
ON public.recipe_templates (owner_household_id);

CREATE INDEX IF NOT EXISTS dish_batches_household_id_created_at_desc_idx
ON public.dish_batches (household_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dish_batch_ingredients_dish_batch_id_idx
ON public.dish_batch_ingredients (dish_batch_id);

CREATE INDEX IF NOT EXISTS serve_split_events_household_id_pending_idx
ON public.serve_split_events (household_id)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idempotency_keys_expires_at_idx
ON public.idempotency_keys (expires_at);

-- domain_events indexes already exist in the events migration and are
-- intentionally not re-declared here.
