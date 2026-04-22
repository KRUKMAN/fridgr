-- Wave 1 advisor cleanup.
-- Fixes: idempotency_keys primary key, auth.uid() initplan warnings, and
-- missing foreign-key indexes. Unused-index notices are intentionally ignored.

ALTER TABLE public.idempotency_keys
ADD COLUMN IF NOT EXISTS id uuid;

UPDATE public.idempotency_keys
SET id = extensions.gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.idempotency_keys
ALTER COLUMN id SET DEFAULT extensions.gen_random_uuid();

ALTER TABLE public.idempotency_keys
ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'idempotency_keys_pkey'
  ) THEN
    ALTER TABLE public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);
  END IF;
END $$;

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self
ON public.users
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self
ON public.users
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS households_select_members ON public.households;
CREATE POLICY households_select_members
ON public.households
FOR SELECT
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR private.is_household_member(id)
);

DROP POLICY IF EXISTS households_insert_owner ON public.households;
CREATE POLICY households_insert_owner
ON public.households
FOR INSERT
TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS households_update_owner ON public.households;
CREATE POLICY households_update_owner
ON public.households
FOR UPDATE
TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS household_members_select_household ON public.household_members;
CREATE POLICY household_members_select_household
ON public.household_members
FOR SELECT
TO authenticated
USING (
  private.is_household_member(household_id)
  OR EXISTS (
    SELECT 1
    FROM public.households AS h
    WHERE h.id = household_members.household_id
      AND h.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS idempotency_keys_select_self ON public.idempotency_keys;
CREATE POLICY idempotency_keys_select_self
ON public.idempotency_keys
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS idempotency_keys_insert_self ON public.idempotency_keys;
CREATE POLICY idempotency_keys_insert_self
ON public.idempotency_keys
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS global_food_submissions_select_submitter
ON public.global_food_submissions;
CREATE POLICY global_food_submissions_select_submitter
ON public.global_food_submissions
FOR SELECT
TO authenticated
USING (submitted_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS global_food_submissions_insert_submitter
ON public.global_food_submissions;
CREATE POLICY global_food_submissions_insert_submitter
ON public.global_food_submissions
FOR INSERT
TO authenticated
WITH CHECK (submitted_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS personal_food_items_select_self
ON public.personal_food_items;
CREATE POLICY personal_food_items_select_self
ON public.personal_food_items
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS personal_food_items_insert_self
ON public.personal_food_items;
CREATE POLICY personal_food_items_insert_self
ON public.personal_food_items
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS personal_food_items_update_self
ON public.personal_food_items;
CREATE POLICY personal_food_items_update_self
ON public.personal_food_items
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS household_food_items_insert_members
ON public.household_food_items;
CREATE POLICY household_food_items_insert_members
ON public.household_food_items
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS household_food_items_update_creator_or_owner
ON public.household_food_items;
CREATE POLICY household_food_items_update_creator_or_owner
ON public.household_food_items
FOR UPDATE
TO authenticated
USING (
  private.is_household_member(household_id)
  AND (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = household_food_items.household_id
        AND h.owner_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  private.is_household_member(household_id)
  AND (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = household_food_items.household_id
        AND h.owner_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS food_variations_select_by_scope ON public.food_variations;
CREATE POLICY food_variations_select_by_scope
ON public.food_variations
FOR SELECT
TO authenticated
USING (
  (scope = 'personal' AND created_by = (SELECT auth.uid()))
  OR (
    scope = 'household'
    AND household_id IS NOT NULL
    AND private.is_household_member(household_id)
  )
  OR scope = 'community'
);

DROP POLICY IF EXISTS food_variations_insert_owned
ON public.food_variations;
CREATE POLICY food_variations_insert_owned
ON public.food_variations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND (
    (scope = 'personal' AND household_id IS NULL)
    OR (
      scope = 'household'
      AND household_id IS NOT NULL
      AND private.is_household_member(household_id)
    )
  )
);

DROP POLICY IF EXISTS food_variations_update_owned
ON public.food_variations;
CREATE POLICY food_variations_update_owned
ON public.food_variations
FOR UPDATE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  AND (
    (scope = 'personal' AND household_id IS NULL)
    OR (
      scope = 'household'
      AND household_id IS NOT NULL
      AND private.is_household_member(household_id)
    )
  )
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND (
    (scope = 'personal' AND household_id IS NULL)
    OR (
      scope = 'household'
      AND household_id IS NOT NULL
      AND private.is_household_member(household_id)
    )
  )
);

DROP POLICY IF EXISTS private_inventory_items_select_self
ON public.private_inventory_items;
CREATE POLICY private_inventory_items_select_self
ON public.private_inventory_items
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS private_inventory_items_insert_self
ON public.private_inventory_items;
CREATE POLICY private_inventory_items_insert_self
ON public.private_inventory_items
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS private_inventory_items_update_self
ON public.private_inventory_items;
CREATE POLICY private_inventory_items_update_self
ON public.private_inventory_items
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS fridge_items_insert_members ON public.fridge_items;
CREATE POLICY fridge_items_insert_members
ON public.fridge_items
FOR INSERT
TO authenticated
WITH CHECK (
  added_by = (SELECT auth.uid())
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS fridge_items_update_creator ON public.fridge_items;
CREATE POLICY fridge_items_update_creator
ON public.fridge_items
FOR UPDATE
TO authenticated
USING (
  added_by = (SELECT auth.uid())
  AND private.is_household_member(household_id)
)
WITH CHECK (
  added_by = (SELECT auth.uid())
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS diary_entries_select_self ON public.diary_entries;
CREATE POLICY diary_entries_select_self
ON public.diary_entries
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS diary_entries_insert_self ON public.diary_entries;
CREATE POLICY diary_entries_insert_self
ON public.diary_entries
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS daily_summaries_select_self ON public.daily_summaries;
CREATE POLICY daily_summaries_select_self
ON public.daily_summaries
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS ai_capture_sessions_select_self
ON public.ai_capture_sessions;
CREATE POLICY ai_capture_sessions_select_self
ON public.ai_capture_sessions
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS ai_capture_sessions_insert_self
ON public.ai_capture_sessions;
CREATE POLICY ai_capture_sessions_insert_self
ON public.ai_capture_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS ai_capture_sessions_update_self
ON public.ai_capture_sessions;
CREATE POLICY ai_capture_sessions_update_self
ON public.ai_capture_sessions
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS ai_capture_items_select_session_owner
ON public.ai_capture_items;
CREATE POLICY ai_capture_items_select_session_owner
ON public.ai_capture_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ai_capture_sessions AS s
    WHERE s.id = ai_capture_items.session_id
      AND s.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS ai_capture_items_insert_session_owner
ON public.ai_capture_items;
CREATE POLICY ai_capture_items_insert_session_owner
ON public.ai_capture_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ai_capture_sessions AS s
    WHERE s.id = ai_capture_items.session_id
      AND s.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS ai_capture_items_update_session_owner
ON public.ai_capture_items;
CREATE POLICY ai_capture_items_update_session_owner
ON public.ai_capture_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ai_capture_sessions AS s
    WHERE s.id = ai_capture_items.session_id
      AND s.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ai_capture_sessions AS s
    WHERE s.id = ai_capture_items.session_id
      AND s.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS dish_batches_insert_members ON public.dish_batches;
CREATE POLICY dish_batches_insert_members
ON public.dish_batches
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS dish_batches_update_creator ON public.dish_batches;
CREATE POLICY dish_batches_update_creator
ON public.dish_batches
FOR UPDATE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  AND private.is_household_member(household_id)
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS dish_batch_ingredients_update_creator
ON public.dish_batch_ingredients;
CREATE POLICY dish_batch_ingredients_update_creator
ON public.dish_batch_ingredients
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.dish_batches AS db
    WHERE db.id = dish_batch_ingredients.dish_batch_id
      AND db.created_by = (SELECT auth.uid())
      AND private.is_household_member(db.household_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.dish_batches AS db
    WHERE db.id = dish_batch_ingredients.dish_batch_id
      AND db.created_by = (SELECT auth.uid())
      AND private.is_household_member(db.household_id)
  )
);

DROP POLICY IF EXISTS serve_split_events_insert_members
ON public.serve_split_events;
CREATE POLICY serve_split_events_insert_members
ON public.serve_split_events
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS serve_split_portions_insert_member_or_self
ON public.serve_split_portions;
CREATE POLICY serve_split_portions_insert_member_or_self
ON public.serve_split_portions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.serve_split_events AS sse
    WHERE sse.id = serve_split_portions.event_id
      AND private.is_household_member(sse.household_id)
      AND (
        sse.created_by = (SELECT auth.uid())
        OR serve_split_portions.user_id = (SELECT auth.uid())
      )
  )
);

DROP POLICY IF EXISTS serve_split_portions_update_self
ON public.serve_split_portions;
CREATE POLICY serve_split_portions_update_self
ON public.serve_split_portions
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.serve_split_events AS sse
    WHERE sse.id = serve_split_portions.event_id
      AND private.is_household_member(sse.household_id)
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.serve_split_events AS sse
    WHERE sse.id = serve_split_portions.event_id
      AND private.is_household_member(sse.household_id)
  )
);

DROP POLICY IF EXISTS recipe_templates_select_visible
ON public.recipe_templates;
CREATE POLICY recipe_templates_select_visible
ON public.recipe_templates
FOR SELECT
TO authenticated
USING (
  (owner_scope = 'personal' AND owner_user_id = (SELECT auth.uid()))
  OR (
    owner_scope = 'household'
    AND owner_household_id IS NOT NULL
    AND private.is_household_member(owner_household_id)
  )
);

DROP POLICY IF EXISTS recipe_templates_insert_owned
ON public.recipe_templates;
CREATE POLICY recipe_templates_insert_owned
ON public.recipe_templates
FOR INSERT
TO authenticated
WITH CHECK (
  (owner_scope = 'personal' AND owner_user_id = (SELECT auth.uid()))
  OR (
    owner_scope = 'household'
    AND owner_household_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = recipe_templates.owner_household_id
        AND h.owner_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS recipe_templates_update_owner
ON public.recipe_templates;
CREATE POLICY recipe_templates_update_owner
ON public.recipe_templates
FOR UPDATE
TO authenticated
USING (
  (owner_scope = 'personal' AND owner_user_id = (SELECT auth.uid()))
  OR (
    owner_scope = 'household'
    AND owner_household_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = recipe_templates.owner_household_id
        AND h.owner_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  (owner_scope = 'personal' AND owner_user_id = (SELECT auth.uid()))
  OR (
    owner_scope = 'household'
    AND owner_household_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = recipe_templates.owner_household_id
        AND h.owner_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS recipe_template_ingredients_select_visible
ON public.recipe_template_ingredients;
CREATE POLICY recipe_template_ingredients_select_visible
ON public.recipe_template_ingredients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recipe_templates AS rt
    WHERE rt.id = recipe_template_ingredients.recipe_template_id
      AND (
        (rt.owner_scope = 'personal' AND rt.owner_user_id = (SELECT auth.uid()))
        OR (
          rt.owner_scope = 'household'
          AND rt.owner_household_id IS NOT NULL
          AND private.is_household_member(rt.owner_household_id)
        )
      )
  )
);

DROP POLICY IF EXISTS recipe_template_ingredients_insert_owner
ON public.recipe_template_ingredients;
CREATE POLICY recipe_template_ingredients_insert_owner
ON public.recipe_template_ingredients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.recipe_templates AS rt
    WHERE rt.id = recipe_template_ingredients.recipe_template_id
      AND (
        (rt.owner_scope = 'personal' AND rt.owner_user_id = (SELECT auth.uid()))
        OR (
          rt.owner_scope = 'household'
          AND rt.owner_household_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.households AS h
            WHERE h.id = rt.owner_household_id
              AND h.owner_id = (SELECT auth.uid())
          )
        )
      )
  )
);

DROP POLICY IF EXISTS recipe_template_ingredients_update_owner
ON public.recipe_template_ingredients;
CREATE POLICY recipe_template_ingredients_update_owner
ON public.recipe_template_ingredients
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recipe_templates AS rt
    WHERE rt.id = recipe_template_ingredients.recipe_template_id
      AND (
        (rt.owner_scope = 'personal' AND rt.owner_user_id = (SELECT auth.uid()))
        OR (
          rt.owner_scope = 'household'
          AND rt.owner_household_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.households AS h
            WHERE h.id = rt.owner_household_id
              AND h.owner_id = (SELECT auth.uid())
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.recipe_templates AS rt
    WHERE rt.id = recipe_template_ingredients.recipe_template_id
      AND (
        (rt.owner_scope = 'personal' AND rt.owner_user_id = (SELECT auth.uid()))
        OR (
          rt.owner_scope = 'household'
          AND rt.owner_household_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.households AS h
            WHERE h.id = rt.owner_household_id
              AND h.owner_id = (SELECT auth.uid())
          )
        )
      )
  )
);

CREATE INDEX IF NOT EXISTS idx_households_owner_id
ON public.households (owner_id);

CREATE INDEX IF NOT EXISTS idx_household_members_user_id
ON public.household_members (user_id);

CREATE INDEX IF NOT EXISTS idx_global_food_submissions_reviewed_by
ON public.global_food_submissions (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_global_food_submissions_submitted_by
ON public.global_food_submissions (submitted_by);

CREATE INDEX IF NOT EXISTS idx_personal_food_items_linked_global_id
ON public.personal_food_items (linked_global_id);

CREATE INDEX IF NOT EXISTS idx_household_food_items_created_by
ON public.household_food_items (created_by);

CREATE INDEX IF NOT EXISTS idx_household_food_items_source_global_food_id
ON public.household_food_items (source_global_food_id);

CREATE INDEX IF NOT EXISTS idx_household_food_items_source_personal_food_id
ON public.household_food_items (source_personal_food_id);

CREATE INDEX IF NOT EXISTS idx_private_inventory_items_added_by
ON public.private_inventory_items (added_by);

CREATE INDEX IF NOT EXISTS idx_private_inventory_items_dish_batch_id
ON public.private_inventory_items (dish_batch_id);

CREATE INDEX IF NOT EXISTS idx_private_inventory_items_food_variation_id
ON public.private_inventory_items (food_variation_id);

CREATE INDEX IF NOT EXISTS idx_private_inventory_items_global_food_id
ON public.private_inventory_items (global_food_id);

CREATE INDEX IF NOT EXISTS idx_private_inventory_items_household_food_item_id
ON public.private_inventory_items (household_food_item_id);

CREATE INDEX IF NOT EXISTS idx_private_inventory_items_household_id
ON public.private_inventory_items (household_id);

CREATE INDEX IF NOT EXISTS idx_private_inventory_items_personal_food_id
ON public.private_inventory_items (personal_food_id);

CREATE INDEX IF NOT EXISTS idx_fridge_items_added_by
ON public.fridge_items (added_by);

CREATE INDEX IF NOT EXISTS idx_fridge_items_food_variation_id
ON public.fridge_items (food_variation_id);

CREATE INDEX IF NOT EXISTS idx_fridge_items_global_food_id
ON public.fridge_items (global_food_id);

CREATE INDEX IF NOT EXISTS idx_fridge_items_household_food_item_id
ON public.fridge_items (household_food_item_id);

CREATE INDEX IF NOT EXISTS idx_fridge_items_personal_food_id
ON public.fridge_items (personal_food_id);

CREATE INDEX IF NOT EXISTS idx_ai_capture_sessions_household_id
ON public.ai_capture_sessions (household_id);

CREATE INDEX IF NOT EXISTS idx_ai_capture_items_session_id
ON public.ai_capture_items (session_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_corrects_entry_id
ON public.diary_entries (corrects_entry_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_household_id
ON public.diary_entries (household_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_serve_split_event_id
ON public.diary_entries (serve_split_event_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_source_dish_batch_id
ON public.diary_entries (source_dish_batch_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_source_fridge_item_id
ON public.diary_entries (source_fridge_item_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_source_global_food_id
ON public.diary_entries (source_global_food_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_source_household_food_item_id
ON public.diary_entries (source_household_food_item_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_source_personal_food_id
ON public.diary_entries (source_personal_food_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_source_private_inventory_item_id
ON public.diary_entries (source_private_inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id
ON public.diary_entries (user_id);

CREATE INDEX IF NOT EXISTS idx_dish_batches_created_by
ON public.dish_batches (created_by);

CREATE INDEX IF NOT EXISTS idx_dish_batches_household_food_item_id
ON public.dish_batches (household_food_item_id);

CREATE INDEX IF NOT EXISTS idx_dish_batches_recipe_template_id
ON public.dish_batches (recipe_template_id);

CREATE INDEX IF NOT EXISTS idx_dish_batch_ingredients_source_fridge_item_id
ON public.dish_batch_ingredients (source_fridge_item_id);

CREATE INDEX IF NOT EXISTS idx_dish_batch_ingredients_source_private_inventory_item_id
ON public.dish_batch_ingredients (source_private_inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_serve_split_events_created_by
ON public.serve_split_events (created_by);

CREATE INDEX IF NOT EXISTS idx_serve_split_events_dish_batch_id
ON public.serve_split_events (dish_batch_id);

CREATE INDEX IF NOT EXISTS idx_serve_split_portions_diary_entry_id
ON public.serve_split_portions (diary_entry_id);

CREATE INDEX IF NOT EXISTS idx_serve_split_portions_event_id
ON public.serve_split_portions (event_id);

CREATE INDEX IF NOT EXISTS idx_serve_split_portions_user_id
ON public.serve_split_portions (user_id);

CREATE INDEX IF NOT EXISTS idx_recipe_templates_created_from_dish_batch_id
ON public.recipe_templates (created_from_dish_batch_id);

CREATE INDEX IF NOT EXISTS idx_recipe_templates_household_food_item_id
ON public.recipe_templates (household_food_item_id);

CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_global_food_id
ON public.recipe_template_ingredients (global_food_id);

CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_household_food_item_id
ON public.recipe_template_ingredients (household_food_item_id);

CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_personal_food_id
ON public.recipe_template_ingredients (personal_food_id);

CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_recipe_template_id
ON public.recipe_template_ingredients (recipe_template_id);
