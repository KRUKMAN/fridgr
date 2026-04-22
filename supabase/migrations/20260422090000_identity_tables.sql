-- Wave 1 identity foundation tables.
-- RLS and TTL cleanup are intentionally deferred to later migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text UNIQUE,
  display_name text,
  avatar_url text,
  target_kcal integer NOT NULL DEFAULT 2000,
  target_protein_mg integer,
  target_carbs_mg integer,
  target_fat_mg integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.users (id),
  invite_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.household_members (
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT household_members_pkey PRIMARY KEY (household_id, user_id),
  CONSTRAINT household_members_role_check CHECK (role IN ('owner', 'member'))
);

CREATE TABLE public.idempotency_keys (
  operation_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  route text NOT NULL,
  request_hash text NOT NULL,
  response_code integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT idempotency_keys_user_route_operation_key
    UNIQUE (user_id, route, operation_id)
);

-- Wave 0 auto-enables RLS on new public tables; keep these wide open until the
-- dedicated RLS migration lands.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.households DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    display_name,
    avatar_url,
    created_at,
    last_active_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name'
    ),
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.last_sign_in_at, NEW.created_at, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    last_active_at = COALESCE(EXCLUDED.last_active_at, public.users.last_active_at);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_auth_user_created();

INSERT INTO public.users (
  id,
  email,
  display_name,
  avatar_url,
  created_at,
  last_active_at
)
SELECT
  auth_user.id,
  auth_user.email,
  COALESCE(
    auth_user.raw_user_meta_data ->> 'display_name',
    auth_user.raw_user_meta_data ->> 'full_name'
  ),
  auth_user.raw_user_meta_data ->> 'avatar_url',
  COALESCE(auth_user.created_at, now()),
  COALESCE(auth_user.last_sign_in_at, auth_user.created_at, now())
FROM auth.users AS auth_user
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  last_active_at = COALESCE(EXCLUDED.last_active_at, public.users.last_active_at);
