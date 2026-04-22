-- Wave D recipe knowledge tables.
-- Recipes are reusable templates, not inventory rows and not dish batches.
-- Depends on the cooking migration creating public.dish_batches first.
-- RecipeTemplateSaved events remain deferred to the later v2 event wave.
-- RLS policies are intentionally deferred to a later migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.recipe_templates (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  owner_scope text NOT NULL,
  owner_user_id uuid REFERENCES public.users (id),
  owner_household_id uuid REFERENCES public.households (id),
  household_food_item_id uuid REFERENCES public.household_food_items (id),
  name text NOT NULL,
  default_output_quantity_base integer,
  default_output_base_unit text,
  notes text,
  created_from_dish_batch_id uuid REFERENCES public.dish_batches (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT recipe_templates_owner_scope_check
    CHECK (owner_scope IN ('personal', 'household')),
  CONSTRAINT recipe_templates_owner_check
    CHECK (
      (
        owner_scope = 'personal' AND
        owner_user_id IS NOT NULL AND
        owner_household_id IS NULL
      ) OR (
        owner_scope = 'household' AND
        owner_household_id IS NOT NULL
      )
    ),
  CONSTRAINT recipe_templates_default_output_quantity_base_check
    CHECK (
      default_output_quantity_base IS NULL OR default_output_quantity_base > 0
    ),
  CONSTRAINT recipe_templates_default_output_base_unit_check
    CHECK (
      default_output_base_unit IS NULL OR
      default_output_base_unit IN ('mass_mg', 'volume_ml', 'count_each')
    ),
  CONSTRAINT recipe_templates_default_output_pair_check
    CHECK (
      (
        default_output_quantity_base IS NULL AND
        default_output_base_unit IS NULL
      ) OR (
        default_output_quantity_base IS NOT NULL AND
        default_output_base_unit IS NOT NULL
      )
    )
);

CREATE TABLE public.recipe_template_ingredients (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  recipe_template_id uuid NOT NULL REFERENCES public.recipe_templates (id),
  preferred_scope text NOT NULL,
  global_food_id uuid REFERENCES public.global_food_items (id),
  personal_food_id uuid REFERENCES public.personal_food_items (id),
  household_food_item_id uuid REFERENCES public.household_food_items (id),
  quantity_base integer NOT NULL,
  base_unit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipe_template_ingredients_preferred_scope_check
    CHECK (preferred_scope IN ('global', 'personal', 'household')),
  CONSTRAINT recipe_template_ingredients_matching_source_check
    CHECK (
      (
        preferred_scope = 'global' AND
        global_food_id IS NOT NULL AND
        personal_food_id IS NULL AND
        household_food_item_id IS NULL
      ) OR (
        preferred_scope = 'personal' AND
        global_food_id IS NULL AND
        personal_food_id IS NOT NULL AND
        household_food_item_id IS NULL
      ) OR (
        preferred_scope = 'household' AND
        global_food_id IS NULL AND
        personal_food_id IS NULL AND
        household_food_item_id IS NOT NULL
      )
    ),
  CONSTRAINT recipe_template_ingredients_quantity_base_check
    CHECK (quantity_base > 0),
  CONSTRAINT recipe_template_ingredients_base_unit_check
    CHECK (base_unit IN ('mass_mg', 'volume_ml', 'count_each'))
);

ALTER TABLE public.dish_batches
ADD CONSTRAINT dish_batches_recipe_template_id_fkey
FOREIGN KEY (recipe_template_id) REFERENCES public.recipe_templates (id);

-- Wave 0 auto-enables RLS on new public tables; keep these wide open until the
-- dedicated RLS migration lands.
ALTER TABLE public.recipe_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_template_ingredients DISABLE ROW LEVEL SECURITY;
