-- Harden Wave 3 diary transactional paths after the initial RPC rollout.
--
-- This keeps the already-applied migration history intact and tightens the live
-- functions in place:
-- - service-role RPCs validate source ownership/membership before writing FKs
-- - correction cancellation rows stay on the original diary day
-- - summaries count client-visible entries, not internal ledger rows
-- - direct authenticated inserts into diary/idempotency tables are closed

DROP POLICY IF EXISTS diary_entries_insert_self ON public.diary_entries;
DROP POLICY IF EXISTS idempotency_keys_insert_self ON public.idempotency_keys;

CREATE OR REPLACE FUNCTION private.is_visible_diary_entry(
  p_entry public.diary_entries
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT
    NOT p_entry.is_correction
    AND NOT EXISTS (
      SELECT 1
      FROM public.diary_entries AS correction
      WHERE correction.corrects_entry_id = p_entry.id
        AND correction.is_correction
    );
$$;

CREATE OR REPLACE FUNCTION private.validate_diary_source_access(
  p_user_id uuid,
  p_household_id uuid,
  p_source_scope text,
  p_source_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF p_source_scope = 'quick_estimate' THEN
    RETURN p_source_id IS NULL;
  END IF;

  IF p_source_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_source_scope = 'global' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.global_food_items AS item
      WHERE item.id = p_source_id
        AND item.deleted_at IS NULL
    );
  END IF;

  IF p_source_scope = 'personal' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.personal_food_items AS item
      WHERE item.id = p_source_id
        AND item.user_id = p_user_id
        AND item.archived_at IS NULL
    );
  END IF;

  IF p_source_scope = 'household' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.household_food_items AS item
      WHERE item.id = p_source_id
        AND item.household_id = p_household_id
        AND item.archived_at IS NULL
    );
  END IF;

  IF p_source_scope = 'private_inventory' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.private_inventory_items AS item
      WHERE item.id = p_source_id
        AND item.user_id = p_user_id
        AND item.household_id = p_household_id
        AND item.archived_at IS NULL
    );
  END IF;

  IF p_source_scope = 'fridge' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.fridge_items AS item
      WHERE item.id = p_source_id
        AND item.household_id = p_household_id
        AND item.archived_at IS NULL
    );
  END IF;

  IF p_source_scope = 'dish_batch' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.dish_batches AS batch
      WHERE batch.id = p_source_id
        AND batch.household_id = p_household_id
        AND batch.status <> 'discarded'
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION private.recompute_daily_summary(
  p_user_id uuid,
  p_date date
)
RETURNS public.daily_summaries
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_summary public.daily_summaries%ROWTYPE;
  v_totals record;
BEGIN
  SELECT
    COALESCE(COUNT(*)::integer, 0) AS entry_count,
    COALESCE(SUM(entry.carbs_mg)::integer, 0) AS total_carbs_mg,
    COALESCE(SUM(entry.fat_mg)::integer, 0) AS total_fat_mg,
    COALESCE(SUM(entry.kcal)::integer, 0) AS total_kcal,
    COALESCE(SUM(entry.protein_mg)::integer, 0) AS total_protein_mg
  INTO v_totals
  FROM public.diary_entries AS entry
  WHERE entry.user_id = p_user_id
    AND entry.logged_at >= p_date::timestamptz
    AND entry.logged_at < (p_date + 1)::timestamptz
    AND private.is_visible_diary_entry(entry);

  INSERT INTO public.daily_summaries (
    user_id,
    date,
    total_kcal,
    total_protein_mg,
    total_carbs_mg,
    total_fat_mg,
    entry_count
  )
  VALUES (
    p_user_id,
    p_date,
    v_totals.total_kcal,
    v_totals.total_protein_mg,
    v_totals.total_carbs_mg,
    v_totals.total_fat_mg,
    v_totals.entry_count
  )
  ON CONFLICT (user_id, date) DO UPDATE
  SET
    total_kcal = EXCLUDED.total_kcal,
    total_protein_mg = EXCLUDED.total_protein_mg,
    total_carbs_mg = EXCLUDED.total_carbs_mg,
    total_fat_mg = EXCLUDED.total_fat_mg,
    entry_count = EXCLUDED.entry_count
  RETURNING *
  INTO v_summary;

  RETURN v_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_diary_entry_transaction(
  p_operation_id uuid,
  p_user_id uuid,
  p_request jsonb
)
RETURNS TABLE(response_code integer, response_body jsonb)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_date date;
  v_entry public.diary_entries%ROWTYPE;
  v_existing public.idempotency_keys%ROWTYPE;
  v_household_id uuid;
  v_request_hash text;
  v_response jsonb;
  v_source_id uuid;
  v_source_scope text;
  v_summary public.daily_summaries%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'POST /api/v1/diary/entries:' || p_user_id::text || ':' || p_operation_id::text,
      0
    )
  );

  v_request_hash := encode(extensions.digest(p_request::text, 'sha256'), 'hex');

  SELECT *
  INTO v_existing
  FROM public.idempotency_keys
  WHERE user_id = p_user_id
    AND route = 'POST /api/v1/diary/entries'
    AND operation_id = p_operation_id;

  IF FOUND THEN
    IF v_existing.request_hash <> v_request_hash THEN
      response_code := 409;
      response_body := private.envelope_response(
        NULL,
        jsonb_build_object(
          'code', 'conflict',
          'message', 'Idempotency-Key was already used with a different payload'
        ),
        p_operation_id
      );
      RETURN NEXT;
      RETURN;
    END IF;

    response_code := v_existing.response_code;
    response_body := v_existing.response_body;
    RETURN NEXT;
    RETURN;
  END IF;

  v_household_id := (p_request ->> 'household_id')::uuid;
  v_source_scope := p_request ->> 'source_scope';
  v_source_id := NULLIF(p_request ->> 'source_id', '')::uuid;
  v_date := LEFT(p_request ->> 'logged_at', 10)::date;

  IF NOT EXISTS (
    SELECT 1
    FROM public.household_members AS member
    JOIN public.households AS household
      ON household.id = member.household_id
    WHERE member.user_id = p_user_id
      AND member.household_id = v_household_id
      AND household.archived_at IS NULL
  ) THEN
    response_code := 403;
    response_body := private.envelope_response(
      NULL,
      jsonb_build_object('code', 'forbidden', 'message', 'not a household member'),
      p_operation_id
    );
    RETURN NEXT;
    RETURN;
  END IF;

  IF NOT private.validate_diary_source_access(
    p_user_id,
    v_household_id,
    v_source_scope,
    v_source_id
  ) THEN
    response_code := 403;
    response_body := private.envelope_response(
      NULL,
      jsonb_build_object('code', 'forbidden', 'message', 'source is not accessible'),
      p_operation_id
    );
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.diary_entries (
    user_id,
    household_id,
    food_name,
    source_scope,
    source_global_food_id,
    source_personal_food_id,
    source_household_food_item_id,
    source_private_inventory_item_id,
    source_fridge_item_id,
    source_dish_batch_id,
    quantity_base,
    base_unit,
    kcal,
    protein_mg,
    carbs_mg,
    fat_mg,
    source,
    confidence,
    is_quick_estimate,
    logged_at
  )
  VALUES (
    p_user_id,
    v_household_id,
    p_request ->> 'food_name',
    v_source_scope,
    CASE WHEN v_source_scope = 'global' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'personal' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'household' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'private_inventory' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'fridge' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'dish_batch' THEN v_source_id ELSE NULL END,
    (p_request ->> 'quantity_base')::integer,
    p_request ->> 'base_unit',
    ROUND((p_request ->> 'kcal')::numeric)::integer,
    (p_request ->> 'protein_mg')::integer,
    (p_request ->> 'carbs_mg')::integer,
    (p_request ->> 'fat_mg')::integer,
    'manual',
    NULLIF(p_request ->> 'confidence', '')::double precision,
    COALESCE((p_request ->> 'is_quick_estimate')::boolean, false),
    (p_request ->> 'logged_at')::timestamptz
  )
  RETURNING *
  INTO v_entry;

  v_summary := private.recompute_daily_summary(p_user_id, v_date);

  INSERT INTO public.domain_events (
    type,
    payload,
    actor_id,
    household_id,
    version
  )
  VALUES (
    'DiaryEntryCreated',
    jsonb_build_object(
      'base_unit', v_entry.base_unit,
      'diary_entry_id', v_entry.id,
      'food_name', v_entry.food_name,
      'kcal', v_entry.kcal,
      'quantity_base', v_entry.quantity_base,
      'source_scope', v_entry.source_scope
    ),
    p_user_id,
    v_household_id,
    1
  );

  v_response := private.envelope_response(
    jsonb_build_object(
      'daily_summary', private.map_daily_summary_response(v_summary),
      'diary_entry', private.map_diary_entry_response(v_entry)
    ),
    NULL,
    p_operation_id
  );

  INSERT INTO public.idempotency_keys (
    operation_id,
    user_id,
    route,
    request_hash,
    response_code,
    response_body
  )
  VALUES (
    p_operation_id,
    p_user_id,
    'POST /api/v1/diary/entries',
    v_request_hash,
    201,
    v_response
  );

  response_code := 201;
  response_body := v_response;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.correct_diary_entry_transaction(
  p_operation_id uuid,
  p_user_id uuid,
  p_original_entry_id uuid,
  p_request jsonb
)
RETURNS TABLE(response_code integer, response_body jsonb)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_correction public.diary_entries%ROWTYPE;
  v_existing public.idempotency_keys%ROWTYPE;
  v_original public.diary_entries%ROWTYPE;
  v_original_date date;
  v_replacement jsonb;
  v_replacement_date date;
  v_replacement_entry public.diary_entries%ROWTYPE;
  v_request_hash text;
  v_response jsonb;
  v_route text;
  v_source_id uuid;
  v_source_scope text;
  v_summary public.daily_summaries%ROWTYPE;
BEGIN
  v_route := 'POST /api/v1/diary/entries/' || p_original_entry_id::text || '/correct';

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_route || ':' || p_user_id::text || ':' || p_operation_id::text, 0)
  );

  v_request_hash := encode(extensions.digest(p_request::text, 'sha256'), 'hex');

  SELECT *
  INTO v_existing
  FROM public.idempotency_keys
  WHERE user_id = p_user_id
    AND route = v_route
    AND operation_id = p_operation_id;

  IF FOUND THEN
    IF v_existing.request_hash <> v_request_hash THEN
      response_code := 409;
      response_body := private.envelope_response(
        NULL,
        jsonb_build_object(
          'code', 'conflict',
          'message', 'Idempotency-Key was already used with a different payload'
        ),
        p_operation_id
      );
      RETURN NEXT;
      RETURN;
    END IF;

    response_code := v_existing.response_code;
    response_body := v_existing.response_body;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT *
  INTO v_original
  FROM public.diary_entries
  WHERE id = p_original_entry_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    response_code := 404;
    response_body := private.envelope_response(
      NULL,
      jsonb_build_object('code', 'not_found', 'message', 'diary entry not found'),
      p_operation_id
    );
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_original.is_correction THEN
    response_code := 409;
    response_body := private.envelope_response(
      NULL,
      jsonb_build_object('code', 'conflict', 'message', 'correction entries cannot be corrected'),
      p_operation_id
    );
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_original.corrects_entry_id IS NOT NULL THEN
    response_code := 409;
    response_body := private.envelope_response(
      NULL,
      jsonb_build_object('code', 'conflict', 'message', 'replacement entries cannot be corrected'),
      p_operation_id
    );
    RETURN NEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.diary_entries AS correction
    WHERE correction.user_id = p_user_id
      AND correction.corrects_entry_id = v_original.id
      AND correction.is_correction
  ) THEN
    response_code := 409;
    response_body := private.envelope_response(
      NULL,
      jsonb_build_object('code', 'conflict', 'message', 'diary entry has already been corrected'),
      p_operation_id
    );
    RETURN NEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.household_members AS member
    JOIN public.households AS household
      ON household.id = member.household_id
    WHERE member.user_id = p_user_id
      AND member.household_id = v_original.household_id
      AND household.archived_at IS NULL
  ) THEN
    response_code := 403;
    response_body := private.envelope_response(
      NULL,
      jsonb_build_object('code', 'forbidden', 'message', 'not a household member'),
      p_operation_id
    );
    RETURN NEXT;
    RETURN;
  END IF;

  v_replacement := p_request -> 'replacement';
  v_original_date := v_original.logged_at::date;
  v_replacement_date := COALESCE(
    LEFT(v_replacement ->> 'logged_at', 10)::date,
    v_original_date
  );
  v_source_scope := COALESCE(v_replacement ->> 'source_scope', v_original.source_scope);
  v_source_id := COALESCE(
    NULLIF(v_replacement ->> 'source_id', '')::uuid,
    CASE
      WHEN v_source_scope = 'global' THEN v_original.source_global_food_id
      WHEN v_source_scope = 'personal' THEN v_original.source_personal_food_id
      WHEN v_source_scope = 'household' THEN v_original.source_household_food_item_id
      WHEN v_source_scope = 'private_inventory' THEN v_original.source_private_inventory_item_id
      WHEN v_source_scope = 'fridge' THEN v_original.source_fridge_item_id
      WHEN v_source_scope = 'dish_batch' THEN v_original.source_dish_batch_id
      ELSE NULL
    END
  );

  IF NOT private.validate_diary_source_access(
    p_user_id,
    v_original.household_id,
    v_source_scope,
    v_source_id
  ) THEN
    response_code := 403;
    response_body := private.envelope_response(
      NULL,
      jsonb_build_object('code', 'forbidden', 'message', 'source is not accessible'),
      p_operation_id
    );
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.diary_entries (
    user_id,
    household_id,
    food_name,
    source_scope,
    source_global_food_id,
    source_personal_food_id,
    source_household_food_item_id,
    source_private_inventory_item_id,
    source_fridge_item_id,
    source_dish_batch_id,
    quantity_base,
    base_unit,
    kcal,
    protein_mg,
    carbs_mg,
    fat_mg,
    source,
    confidence,
    is_quick_estimate,
    is_correction,
    corrects_entry_id,
    logged_at
  )
  VALUES (
    p_user_id,
    v_original.household_id,
    'Correction for ' || v_original.food_name,
    v_original.source_scope,
    v_original.source_global_food_id,
    v_original.source_personal_food_id,
    v_original.source_household_food_item_id,
    v_original.source_private_inventory_item_id,
    v_original.source_fridge_item_id,
    v_original.source_dish_batch_id,
    v_original.quantity_base,
    v_original.base_unit,
    -v_original.kcal,
    -v_original.protein_mg,
    -v_original.carbs_mg,
    -v_original.fat_mg,
    'correction',
    v_original.confidence,
    false,
    true,
    v_original.id,
    v_original.logged_at
  )
  RETURNING *
  INTO v_correction;

  INSERT INTO public.diary_entries (
    user_id,
    household_id,
    food_name,
    source_scope,
    source_global_food_id,
    source_personal_food_id,
    source_household_food_item_id,
    source_private_inventory_item_id,
    source_fridge_item_id,
    source_dish_batch_id,
    quantity_base,
    base_unit,
    kcal,
    protein_mg,
    carbs_mg,
    fat_mg,
    source,
    confidence,
    is_quick_estimate,
    corrects_entry_id,
    logged_at
  )
  VALUES (
    p_user_id,
    v_original.household_id,
    v_replacement ->> 'food_name',
    v_source_scope,
    CASE WHEN v_source_scope = 'global' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'personal' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'household' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'private_inventory' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'fridge' THEN v_source_id ELSE NULL END,
    CASE WHEN v_source_scope = 'dish_batch' THEN v_source_id ELSE NULL END,
    (v_replacement ->> 'quantity_base')::integer,
    v_replacement ->> 'base_unit',
    ROUND((v_replacement ->> 'kcal')::numeric)::integer,
    (v_replacement ->> 'protein_mg')::integer,
    (v_replacement ->> 'carbs_mg')::integer,
    (v_replacement ->> 'fat_mg')::integer,
    'correction_replacement',
    NULLIF(v_replacement ->> 'confidence', '')::double precision,
    COALESCE((v_replacement ->> 'is_quick_estimate')::boolean, false),
    v_original.id,
    COALESCE((v_replacement ->> 'logged_at')::timestamptz, v_original.logged_at)
  )
  RETURNING *
  INTO v_replacement_entry;

  v_summary := private.recompute_daily_summary(p_user_id, v_original_date);

  IF v_replacement_date <> v_original_date THEN
    v_summary := private.recompute_daily_summary(p_user_id, v_replacement_date);
  END IF;

  INSERT INTO public.domain_events (
    type,
    payload,
    actor_id,
    household_id,
    version
  )
  VALUES (
    'DiaryEntryCorrected',
    jsonb_build_object(
      'correction_entry_id', v_correction.id,
      'original_entry_id', v_original.id,
      'delta_kcal', v_replacement_entry.kcal - v_original.kcal,
      'delta_protein_mg', v_replacement_entry.protein_mg - v_original.protein_mg,
      'delta_carbs_mg', v_replacement_entry.carbs_mg - v_original.carbs_mg,
      'delta_fat_mg', v_replacement_entry.fat_mg - v_original.fat_mg
    ),
    p_user_id,
    v_original.household_id,
    1
  );

  v_response := private.envelope_response(
    jsonb_build_object(
      'correction_entry', private.map_diary_entry_response(v_correction),
      'daily_summary', private.map_daily_summary_response(v_summary),
      'replacement_entry', private.map_diary_entry_response(v_replacement_entry)
    ),
    NULL,
    p_operation_id
  );

  INSERT INTO public.idempotency_keys (
    operation_id,
    user_id,
    route,
    request_hash,
    response_code,
    response_body
  )
  VALUES (
    p_operation_id,
    p_user_id,
    v_route,
    v_request_hash,
    201,
    v_response
  );

  response_code := 201;
  response_body := v_response;
  RETURN NEXT;
END;
$$;
