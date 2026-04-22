-- Wave 1 catalog-layer foundation tables.
-- Index-heavy follow-up work is intentionally deferred to the dedicated
-- indexes migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.global_food_items (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  canonical_name text NOT NULL,
  brand text,
  barcode text,
  category text NOT NULL,
  nutrition_basis text NOT NULL DEFAULT 'per_100g',
  density_mg_per_ml integer,
  kcal_per_100_unit integer NOT NULL,
  protein_mg_per_100_unit integer NOT NULL,
  carbs_mg_per_100_unit integer NOT NULL,
  fat_mg_per_100_unit integer NOT NULL,
  fiber_mg_per_100_unit integer,
  default_serving_g integer,
  default_shelf_life_days integer,
  source_type text NOT NULL,
  quality_score double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT global_food_items_nutrition_basis_check
    CHECK (nutrition_basis IN ('per_100g', 'per_100ml')),
  CONSTRAINT global_food_items_source_type_check
    CHECK (source_type IN ('imported', 'verified_user_submission', 'curated'))
);

CREATE TABLE public.global_food_submissions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES public.users (id),
  proposed_name text NOT NULL,
  proposed_brand text,
  proposed_barcode text,
  proposed_payload jsonb NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT global_food_submissions_verification_status_check
    CHECK (verification_status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE public.personal_food_items (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  name text NOT NULL,
  category text,
  nutrition_basis text NOT NULL DEFAULT 'per_100g',
  density_mg_per_ml integer,
  kcal_per_100_unit integer NOT NULL,
  protein_mg_per_100_unit integer NOT NULL,
  carbs_mg_per_100_unit integer NOT NULL,
  fat_mg_per_100_unit integer NOT NULL,
  linked_global_id uuid REFERENCES public.global_food_items (id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT personal_food_items_nutrition_basis_check
    CHECK (nutrition_basis IN ('per_100g', 'per_100ml'))
);

CREATE TABLE public.household_food_items (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id),
  created_by uuid NOT NULL REFERENCES public.users (id),
  kind text NOT NULL,
  name text NOT NULL,
  source_global_food_id uuid REFERENCES public.global_food_items (id),
  source_personal_food_id uuid REFERENCES public.personal_food_items (id),
  nutrition_basis text NOT NULL DEFAULT 'per_100g',
  density_mg_per_ml integer,
  kcal_per_100_unit integer NOT NULL,
  protein_mg_per_100_unit integer NOT NULL,
  carbs_mg_per_100_unit integer NOT NULL,
  fat_mg_per_100_unit integer NOT NULL,
  default_unit_display text,
  sharing_mode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT household_food_items_kind_check
    CHECK (kind IN ('product', 'dish')),
  CONSTRAINT household_food_items_nutrition_basis_check
    CHECK (nutrition_basis IN ('per_100g', 'per_100ml')),
  CONSTRAINT household_food_items_sharing_mode_check
    CHECK (
      sharing_mode IN (
        'direct',
        'promoted_from_personal',
        'promoted_from_global',
        'generated_from_recipe'
      )
    )
);

CREATE TABLE public.food_variations (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  canonical_food_id uuid REFERENCES public.global_food_items (id),
  created_by uuid NOT NULL REFERENCES public.users (id),
  household_id uuid REFERENCES public.households (id),
  scope text NOT NULL DEFAULT 'personal',
  status text NOT NULL DEFAULT 'unresolved',
  name text NOT NULL,
  brand text,
  barcode text,
  category text,
  nutrition_basis text NOT NULL DEFAULT 'per_100g',
  density_mg_per_ml integer,
  kcal_per_100_unit integer,
  protein_mg_per_100_unit integer,
  carbs_mg_per_100_unit integer,
  fat_mg_per_100_unit integer,
  image_url text,
  notes text,
  evidence_count integer NOT NULL DEFAULT 0,
  source_context text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT food_variations_scope_check
    CHECK (scope IN ('personal', 'household', 'community')),
  CONSTRAINT food_variations_status_check
    CHECK (status IN ('unresolved', 'confirmed', 'promoted')),
  CONSTRAINT food_variations_nutrition_basis_check
    CHECK (nutrition_basis IN ('per_100g', 'per_100ml')),
  CONSTRAINT food_variations_source_context_check
    CHECK (
      source_context IS NULL OR source_context IN (
        'receipt_parse',
        'voice_parse',
        'manual_add',
        'barcode_scan'
      )
    )
);

-- Wave 0 auto-enables RLS on new public tables; keep these wide open until the
-- dedicated RLS migration lands.
ALTER TABLE public.global_food_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_food_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_food_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_food_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_variations DISABLE ROW LEVEL SECURITY;
