-- Baseline security migration for Wave 0.
-- This establishes default deny-all posture by enabling RLS on existing public
-- tables and auto-enabling RLS for future public tables.
-- Table-specific policies are intentionally deferred to Wave 1.

DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      table_record.schemaname,
      table_record.tablename
    );
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.enable_rls_on_new_public_tables()
RETURNS event_trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  ddl_record RECORD;
BEGIN
  FOR ddl_record IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF ddl_record.object_type = 'table' AND ddl_record.schema_name = 'public' THEN
      EXECUTE format(
        'ALTER TABLE %s ENABLE ROW LEVEL SECURITY',
        ddl_record.object_identity
      );
    END IF;
  END LOOP;
END
$$;

DROP EVENT TRIGGER IF EXISTS trg_enable_rls_on_public_table_create;

CREATE EVENT TRIGGER trg_enable_rls_on_public_table_create
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION public.enable_rls_on_new_public_tables();
