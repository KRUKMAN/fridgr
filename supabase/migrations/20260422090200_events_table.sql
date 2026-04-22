-- Shared domain event log for v1 event fan-out and audit history.
-- Depends on public.users and public.households existing before execution.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.domain_events (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  type text NOT NULL,
  payload jsonb NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.users (id),
  household_id uuid REFERENCES public.households (id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT domain_events_type_check CHECK (
    type IN (
      'FridgeItemAdded',
      'FridgeItemConsumed',
      'FridgeItemWasted',
      'PrivateInventoryItemAdded',
      'PrivateInventoryItemConsumed',
      'DiaryEntryCreated',
      'DiaryEntryCorrected',
      'DishBatchCreated',
      'ServeSplitCreated',
      'ServeSplitCompleted',
      'AiSubmissionConfirmed'
    )
  )
);

CREATE INDEX domain_events_type_occurred_at_idx
ON public.domain_events (type, occurred_at DESC);

CREATE INDEX domain_events_household_id_occurred_at_idx
ON public.domain_events (household_id, occurred_at DESC);

CREATE INDEX domain_events_actor_id_occurred_at_idx
ON public.domain_events (actor_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.notify_domain_events_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM pg_notify('domain_events', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_domain_events_after_insert_notify
AFTER INSERT ON public.domain_events
FOR EACH ROW
EXECUTE FUNCTION public.notify_domain_events_after_insert();

-- Wave 0 auto-enables RLS on new public tables; keep this table wide open
-- until the dedicated RLS migration lands.
ALTER TABLE public.domain_events DISABLE ROW LEVEL SECURITY;
