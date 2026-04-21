-- Seed required private storage buckets for the dev environment.
-- Buckets are private by default and policies allow authenticated access only.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('receipts', 'receipts', false),
  ('avatars', 'avatars', false)
ON CONFLICT (id)
DO UPDATE SET
  public = EXCLUDED.public,
  name = EXCLUDED.name;

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'buckets'
      AND policyname = 'authenticated_can_select_app_buckets'
  ) THEN
    CREATE POLICY authenticated_can_select_app_buckets
      ON storage.buckets
      FOR SELECT
      TO authenticated
      USING (id IN ('receipts', 'avatars'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'authenticated_can_select_app_objects'
  ) THEN
    CREATE POLICY authenticated_can_select_app_objects
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id IN ('receipts', 'avatars')
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'authenticated_can_insert_app_objects'
  ) THEN
    CREATE POLICY authenticated_can_insert_app_objects
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id IN ('receipts', 'avatars')
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'authenticated_can_update_app_objects'
  ) THEN
    CREATE POLICY authenticated_can_update_app_objects
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id IN ('receipts', 'avatars')
        AND auth.role() = 'authenticated'
      )
      WITH CHECK (
        bucket_id IN ('receipts', 'avatars')
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'authenticated_can_delete_app_objects'
  ) THEN
    CREATE POLICY authenticated_can_delete_app_objects
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id IN ('receipts', 'avatars')
        AND auth.role() = 'authenticated'
      );
  END IF;
END
$$;