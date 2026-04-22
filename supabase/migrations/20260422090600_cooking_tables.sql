-- Wave C cooking production and serve/split tables.
-- Depends on identity, catalog, inventory, and diary migrations executing
-- first. RLS policies are intentionally deferred to a later migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.dish_batches (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id),
  created_by uuid NOT NULL REFERENCES public.users (id),
  -- Intentionally left as a plain UUID until the recipe template schema exists.
  recipe_template_id uuid,
  household_food_item_id uuid REFERENCES public.household_food_items (id),
  name text NOT NULL,
  output_inventory_scope text NOT NULL,
  output_inventory_item_id uuid,
  output_quantity_base integer NOT NULL,
  base_unit text NOT NULL,
  nutrition_basis text NOT NULL,
  kcal_total integer NOT NULL,
  protein_mg_total integer NOT NULL,
  carbs_mg_total integer NOT NULL,
  fat_mg_total integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dish_batches_output_inventory_scope_check
    CHECK (output_inventory_scope IN ('private_inventory', 'fridge')),
  CONSTRAINT dish_batches_output_quantity_base_check
    CHECK (output_quantity_base > 0),
  CONSTRAINT dish_batches_base_unit_check
    CHECK (base_unit IN ('mass_mg', 'volume_ml', 'count_each')),
  CONSTRAINT dish_batches_nutrition_basis_check
    CHECK (nutrition_basis IN ('per_100g', 'per_100ml')),
  CONSTRAINT dish_batches_kcal_total_check
    CHECK (kcal_total >= 0),
  CONSTRAINT dish_batches_protein_mg_total_check
    CHECK (protein_mg_total >= 0),
  CONSTRAINT dish_batches_carbs_mg_total_check
    CHECK (carbs_mg_total >= 0),
  CONSTRAINT dish_batches_fat_mg_total_check
    CHECK (fat_mg_total >= 0),
  CONSTRAINT dish_batches_status_check
    CHECK (
      status IN (
        'draft',
        'finalized',
        'partially_consumed',
        'consumed',
        'discarded'
      )
    )
);

CREATE TABLE public.dish_batch_ingredients (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  dish_batch_id uuid NOT NULL REFERENCES public.dish_batches (id),
  source_private_inventory_item_id uuid
    REFERENCES public.private_inventory_items (id),
  source_fridge_item_id uuid REFERENCES public.fridge_items (id),
  source_snapshot_food_name text NOT NULL,
  quantity_used_base integer NOT NULL,
  base_unit text NOT NULL,
  kcal_contributed integer NOT NULL,
  protein_mg_contributed integer NOT NULL,
  carbs_mg_contributed integer NOT NULL,
  fat_mg_contributed integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dish_batch_ingredients_exactly_one_source_check
    CHECK (
      (
        (source_private_inventory_item_id IS NOT NULL)::integer +
        (source_fridge_item_id IS NOT NULL)::integer
      ) = 1
    ),
  CONSTRAINT dish_batch_ingredients_quantity_used_base_check
    CHECK (quantity_used_base > 0),
  CONSTRAINT dish_batch_ingredients_base_unit_check
    CHECK (base_unit IN ('mass_mg', 'volume_ml', 'count_each')),
  CONSTRAINT dish_batch_ingredients_kcal_contributed_check
    CHECK (kcal_contributed >= 0),
  CONSTRAINT dish_batch_ingredients_protein_mg_contributed_check
    CHECK (protein_mg_contributed >= 0),
  CONSTRAINT dish_batch_ingredients_carbs_mg_contributed_check
    CHECK (carbs_mg_contributed >= 0),
  CONSTRAINT dish_batch_ingredients_fat_mg_contributed_check
    CHECK (fat_mg_contributed >= 0)
);

CREATE TABLE public.serve_split_events (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id),
  created_by uuid NOT NULL REFERENCES public.users (id),
  dish_batch_id uuid NOT NULL REFERENCES public.dish_batches (id),
  total_quantity_base integer NOT NULL,
  base_unit text NOT NULL,
  total_kcal integer NOT NULL,
  total_protein_mg integer NOT NULL,
  total_carbs_mg integer NOT NULL,
  total_fat_mg integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  CONSTRAINT serve_split_events_total_quantity_base_check
    CHECK (total_quantity_base > 0),
  CONSTRAINT serve_split_events_base_unit_check
    CHECK (base_unit IN ('mass_mg', 'volume_ml', 'count_each')),
  CONSTRAINT serve_split_events_total_kcal_check
    CHECK (total_kcal >= 0),
  CONSTRAINT serve_split_events_total_protein_mg_check
    CHECK (total_protein_mg >= 0),
  CONSTRAINT serve_split_events_total_carbs_mg_check
    CHECK (total_carbs_mg >= 0),
  CONSTRAINT serve_split_events_total_fat_mg_check
    CHECK (total_fat_mg >= 0),
  CONSTRAINT serve_split_events_status_check
    CHECK (status IN ('pending', 'completed', 'expired'))
);

CREATE TABLE public.serve_split_portions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.serve_split_events (id),
  user_id uuid NOT NULL REFERENCES public.users (id),
  percentage numeric(5,2),
  quantity_base integer NOT NULL,
  base_unit text NOT NULL,
  kcal integer NOT NULL,
  protein_mg integer NOT NULL,
  carbs_mg integer NOT NULL,
  fat_mg integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  diary_entry_id uuid REFERENCES public.diary_entries (id),
  responded_at timestamptz,
  CONSTRAINT serve_split_portions_percentage_check
    CHECK (percentage IS NULL OR (percentage > 0 AND percentage <= 100)),
  CONSTRAINT serve_split_portions_quantity_base_check
    CHECK (quantity_base > 0),
  CONSTRAINT serve_split_portions_base_unit_check
    CHECK (base_unit IN ('mass_mg', 'volume_ml', 'count_each')),
  CONSTRAINT serve_split_portions_kcal_check
    CHECK (kcal >= 0),
  CONSTRAINT serve_split_portions_protein_mg_check
    CHECK (protein_mg >= 0),
  CONSTRAINT serve_split_portions_carbs_mg_check
    CHECK (carbs_mg >= 0),
  CONSTRAINT serve_split_portions_fat_mg_check
    CHECK (fat_mg >= 0),
  CONSTRAINT serve_split_portions_status_check
    CHECK (status IN ('pending', 'accepted', 'declined'))
);

ALTER TABLE public.private_inventory_items
ADD CONSTRAINT private_inventory_items_dish_batch_id_fkey
FOREIGN KEY (dish_batch_id) REFERENCES public.dish_batches (id);

ALTER TABLE public.fridge_items
ADD CONSTRAINT fridge_items_dish_batch_id_fkey
FOREIGN KEY (dish_batch_id) REFERENCES public.dish_batches (id);

ALTER TABLE public.diary_entries
ADD CONSTRAINT diary_entries_source_dish_batch_id_fkey
FOREIGN KEY (source_dish_batch_id) REFERENCES public.dish_batches (id);

ALTER TABLE public.diary_entries
ADD CONSTRAINT diary_entries_serve_split_event_id_fkey
FOREIGN KEY (serve_split_event_id) REFERENCES public.serve_split_events (id);

-- Wave 0 auto-enables RLS on new public tables; keep these wide open until the
-- dedicated RLS migration lands.
ALTER TABLE public.dish_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_batch_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.serve_split_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.serve_split_portions DISABLE ROW LEVEL SECURITY;
