-- Wave B inventory tables.
-- Depends on public.users, public.households, and catalog tables from Wave A.
-- RLS policies are intentionally deferred to a later migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.private_inventory_items (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  household_id uuid NOT NULL REFERENCES public.households (id),
  global_food_id uuid REFERENCES public.global_food_items (id),
  personal_food_id uuid REFERENCES public.personal_food_items (id),
  household_food_item_id uuid REFERENCES public.household_food_items (id),
  -- dish_batch_id intentionally remains a plain uuid until the cooking wave
  -- back-fills the foreign key.
  dish_batch_id uuid,
  food_variation_id uuid REFERENCES public.food_variations (id),
  snapshot_food_name text NOT NULL,
  snapshot_nutrition_basis text NOT NULL,
  snapshot_kcal_per_100_unit integer NOT NULL,
  snapshot_protein_mg_per_100_unit integer NOT NULL,
  snapshot_carbs_mg_per_100_unit integer NOT NULL,
  snapshot_fat_mg_per_100_unit integer NOT NULL,
  snapshot_category text,
  snapshot_density_mg_per_ml integer,
  quantity_base integer NOT NULL,
  base_unit text NOT NULL,
  unit_display text NOT NULL,
  storage_label text,
  estimated_expiry date,
  version integer NOT NULL DEFAULT 1,
  added_by uuid NOT NULL REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT private_inventory_items_snapshot_nutrition_basis_check
    CHECK (snapshot_nutrition_basis IN ('per_100g', 'per_100ml')),
  CONSTRAINT private_inventory_items_quantity_base_check
    CHECK (quantity_base > 0),
  CONSTRAINT private_inventory_items_base_unit_check
    CHECK (base_unit IN ('mass_mg', 'volume_ml', 'count_each')),
  CONSTRAINT private_inventory_items_exactly_one_source_check
    CHECK (
      (
        (global_food_id IS NOT NULL)::integer +
        (personal_food_id IS NOT NULL)::integer +
        (household_food_item_id IS NOT NULL)::integer +
        (dish_batch_id IS NOT NULL)::integer +
        (food_variation_id IS NOT NULL)::integer
      ) = 1
    )
);

CREATE TABLE public.fridge_items (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id),
  global_food_id uuid REFERENCES public.global_food_items (id),
  personal_food_id uuid REFERENCES public.personal_food_items (id),
  household_food_item_id uuid REFERENCES public.household_food_items (id),
  -- dish_batch_id intentionally remains a plain uuid until the cooking wave
  -- back-fills the foreign key.
  dish_batch_id uuid,
  food_variation_id uuid REFERENCES public.food_variations (id),
  snapshot_food_name text NOT NULL,
  snapshot_nutrition_basis text NOT NULL,
  snapshot_kcal_per_100_unit integer NOT NULL,
  snapshot_protein_mg_per_100_unit integer NOT NULL,
  snapshot_carbs_mg_per_100_unit integer NOT NULL,
  snapshot_fat_mg_per_100_unit integer NOT NULL,
  snapshot_category text,
  snapshot_density_mg_per_ml integer,
  quantity_base integer NOT NULL,
  base_unit text NOT NULL,
  unit_display text NOT NULL,
  estimated_expiry date,
  version integer NOT NULL DEFAULT 1,
  added_by uuid NOT NULL REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT fridge_items_snapshot_nutrition_basis_check
    CHECK (snapshot_nutrition_basis IN ('per_100g', 'per_100ml')),
  CONSTRAINT fridge_items_quantity_base_check
    CHECK (quantity_base > 0),
  CONSTRAINT fridge_items_base_unit_check
    CHECK (base_unit IN ('mass_mg', 'volume_ml', 'count_each')),
  CONSTRAINT fridge_items_exactly_one_source_check
    CHECK (
      (
        (global_food_id IS NOT NULL)::integer +
        (personal_food_id IS NOT NULL)::integer +
        (household_food_item_id IS NOT NULL)::integer +
        (dish_batch_id IS NOT NULL)::integer +
        (food_variation_id IS NOT NULL)::integer
      ) = 1
    )
);

CREATE OR REPLACE FUNCTION private.prevent_inventory_item_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF
    NEW.snapshot_food_name IS DISTINCT FROM OLD.snapshot_food_name OR
    NEW.snapshot_nutrition_basis IS DISTINCT FROM OLD.snapshot_nutrition_basis OR
    NEW.snapshot_kcal_per_100_unit IS DISTINCT FROM OLD.snapshot_kcal_per_100_unit OR
    NEW.snapshot_protein_mg_per_100_unit IS DISTINCT FROM OLD.snapshot_protein_mg_per_100_unit OR
    NEW.snapshot_carbs_mg_per_100_unit IS DISTINCT FROM OLD.snapshot_carbs_mg_per_100_unit OR
    NEW.snapshot_fat_mg_per_100_unit IS DISTINCT FROM OLD.snapshot_fat_mg_per_100_unit OR
    NEW.snapshot_category IS DISTINCT FROM OLD.snapshot_category OR
    NEW.snapshot_density_mg_per_ml IS DISTINCT FROM OLD.snapshot_density_mg_per_ml
  THEN
    RAISE EXCEPTION 'snapshot fields are immutable for %', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_inventory_items_snapshot_immutable
ON public.private_inventory_items;

CREATE TRIGGER trg_private_inventory_items_snapshot_immutable
BEFORE UPDATE ON public.private_inventory_items
FOR EACH ROW
EXECUTE FUNCTION private.prevent_inventory_item_snapshot_mutation();

DROP TRIGGER IF EXISTS trg_fridge_items_snapshot_immutable
ON public.fridge_items;

CREATE TRIGGER trg_fridge_items_snapshot_immutable
BEFORE UPDATE ON public.fridge_items
FOR EACH ROW
EXECUTE FUNCTION private.prevent_inventory_item_snapshot_mutation();

-- Wave 0 auto-enables RLS on new public tables; keep these wide open until the
-- dedicated RLS migration lands.
ALTER TABLE public.private_inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fridge_items DISABLE ROW LEVEL SECURITY;
