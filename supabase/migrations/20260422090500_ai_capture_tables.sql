-- Wave 1 draft AI capture tables.
-- These tables store AI parsing drafts only; they are not the source of truth
-- for inventory, diary, or catalog entities.
-- Depends on public.users and public.households existing before execution.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.ai_capture_sessions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  household_id uuid NOT NULL REFERENCES public.households (id),
  capture_type text NOT NULL,
  source_image_url text,
  raw_text text,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz,
  CONSTRAINT ai_capture_sessions_capture_type_check
    CHECK (capture_type IN ('receipt', 'voice', 'barcode')),
  CONSTRAINT ai_capture_sessions_status_check
    CHECK (
      status IN (
        'parsing',
        'parsed',
        'clarifying',
        'pending_confirmation',
        'committed',
        'canceled'
      )
    )
);

CREATE TABLE public.ai_capture_items (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_capture_sessions (id),
  raw_text text,
  resolved_scope text,
  resolved_food_id uuid,
  resolved_variation_id uuid,
  quantity_raw text,
  quantity_base integer,
  base_unit text,
  confidence double precision NOT NULL,
  suggested_destination text,
  action text,
  committed_diary_entry_id uuid,
  committed_inventory_item_id uuid,
  commit_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_capture_items_resolved_scope_check
    CHECK (
      resolved_scope IS NULL OR resolved_scope IN (
        'global',
        'personal',
        'household',
        'variation',
        'unknown'
      )
    ),
  CONSTRAINT ai_capture_items_base_unit_check
    CHECK (
      base_unit IS NULL OR base_unit IN ('mass_mg', 'volume_ml', 'count_each')
    ),
  CONSTRAINT ai_capture_items_suggested_destination_check
    CHECK (
      suggested_destination IS NULL OR suggested_destination IN (
        'private_inventory',
        'fridge',
        'diary',
        'none'
      )
    )
);

CREATE INDEX ai_capture_sessions_user_id_created_at_idx
ON public.ai_capture_sessions (user_id, created_at DESC);

-- Wave 0 auto-enables RLS on new public tables; keep these wide open until the
-- dedicated RLS migration lands.
ALTER TABLE public.ai_capture_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_capture_items DISABLE ROW LEVEL SECURITY;
