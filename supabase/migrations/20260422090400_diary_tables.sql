-- Wave 1 diary log tables.
-- Diary remains append-only: corrections are new rows in public.diary_entries,
-- and public.daily_summaries is recomputed from diary entries elsewhere.
-- Depends on public.users, public.households, catalog tables, and inventory
-- tables existing before execution.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.diary_entries (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  household_id uuid NOT NULL REFERENCES public.households (id),
  food_name text NOT NULL,
  source_scope text NOT NULL,
  source_global_food_id uuid REFERENCES public.global_food_items (id),
  source_personal_food_id uuid REFERENCES public.personal_food_items (id),
  source_household_food_item_id uuid REFERENCES public.household_food_items (id),
  source_private_inventory_item_id uuid
    REFERENCES public.private_inventory_items (id),
  source_fridge_item_id uuid REFERENCES public.fridge_items (id),
  source_dish_batch_id uuid,
  quantity_base integer NOT NULL,
  base_unit text NOT NULL,
  kcal integer NOT NULL,
  protein_mg integer NOT NULL,
  carbs_mg integer NOT NULL,
  fat_mg integer NOT NULL,
  source text,
  confidence double precision,
  is_quick_estimate boolean NOT NULL DEFAULT false,
  is_correction boolean NOT NULL DEFAULT false,
  corrects_entry_id uuid REFERENCES public.diary_entries (id),
  serve_split_event_id uuid,
  logged_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diary_entries_source_scope_check
    CHECK (
      source_scope IN (
        'global',
        'personal',
        'household',
        'private_inventory',
        'fridge',
        'dish_batch',
        'quick_estimate'
      )
    ),
  CONSTRAINT diary_entries_base_unit_check
    CHECK (base_unit IN ('mass_mg', 'volume_ml', 'count_each')),
  CONSTRAINT diary_entries_correction_check
    CHECK (NOT is_correction OR corrects_entry_id IS NOT NULL)
);

CREATE TABLE public.daily_summaries (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  date date NOT NULL,
  total_kcal integer NOT NULL DEFAULT 0,
  total_protein_mg integer NOT NULL DEFAULT 0,
  total_carbs_mg integer NOT NULL DEFAULT 0,
  total_fat_mg integer NOT NULL DEFAULT 0,
  entry_count integer NOT NULL DEFAULT 0,
  CONSTRAINT daily_summaries_user_id_date_key UNIQUE (user_id, date)
);

-- Wave 0 auto-enables RLS on new public tables; keep these wide open until the
-- dedicated RLS migration lands.
ALTER TABLE public.diary_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries DISABLE ROW LEVEL SECURITY;
