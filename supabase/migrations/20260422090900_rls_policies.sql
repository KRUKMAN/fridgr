-- Wave F row-level security policies.
-- This migration intentionally runs last, after all Wave 1 public tables exist.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.handle_auth_user_created()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.prevent_inventory_item_snapshot_mutation()
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_household_member(target_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.household_members AS hm
      WHERE hm.household_id = target_household_id
        AND hm.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION private.is_household_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_household_member(uuid)
TO authenticated, service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_food_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fridge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_capture_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_batch_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serve_split_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serve_split_portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_template_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS households_select_members ON public.households;
CREATE POLICY households_select_members
ON public.households
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR private.is_household_member(id)
);

DROP POLICY IF EXISTS households_insert_owner ON public.households;
CREATE POLICY households_insert_owner
ON public.households
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS households_update_owner ON public.households;
CREATE POLICY households_update_owner
ON public.households
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

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
      AND h.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS idempotency_keys_select_self ON public.idempotency_keys;
CREATE POLICY idempotency_keys_select_self
ON public.idempotency_keys
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS idempotency_keys_insert_self ON public.idempotency_keys;
CREATE POLICY idempotency_keys_insert_self
ON public.idempotency_keys
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS global_food_items_select_authenticated
ON public.global_food_items;
CREATE POLICY global_food_items_select_authenticated
ON public.global_food_items
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS global_food_submissions_select_submitter
ON public.global_food_submissions;
CREATE POLICY global_food_submissions_select_submitter
ON public.global_food_submissions
FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

DROP POLICY IF EXISTS global_food_submissions_insert_submitter
ON public.global_food_submissions;
CREATE POLICY global_food_submissions_insert_submitter
ON public.global_food_submissions
FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS personal_food_items_select_self
ON public.personal_food_items;
CREATE POLICY personal_food_items_select_self
ON public.personal_food_items
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS personal_food_items_insert_self
ON public.personal_food_items;
CREATE POLICY personal_food_items_insert_self
ON public.personal_food_items
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS personal_food_items_update_self
ON public.personal_food_items;
CREATE POLICY personal_food_items_update_self
ON public.personal_food_items
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS household_food_items_select_members
ON public.household_food_items;
CREATE POLICY household_food_items_select_members
ON public.household_food_items
FOR SELECT
TO authenticated
USING (private.is_household_member(household_id));

DROP POLICY IF EXISTS household_food_items_insert_members
ON public.household_food_items;
CREATE POLICY household_food_items_insert_members
ON public.household_food_items
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
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
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = household_food_items.household_id
        AND h.owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  private.is_household_member(household_id)
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = household_food_items.household_id
        AND h.owner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS food_variations_select_by_scope ON public.food_variations;
CREATE POLICY food_variations_select_by_scope
ON public.food_variations
FOR SELECT
TO authenticated
USING (
  (scope = 'personal' AND created_by = auth.uid())
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
  created_by = auth.uid()
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
  created_by = auth.uid()
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
  created_by = auth.uid()
  AND (
    (scope = 'personal' AND household_id IS NULL)
    OR (
      scope = 'household'
      AND household_id IS NOT NULL
      AND private.is_household_member(household_id)
    )
  )
);

DROP POLICY IF EXISTS domain_events_select_household_members
ON public.domain_events;
CREATE POLICY domain_events_select_household_members
ON public.domain_events
FOR SELECT
TO authenticated
USING (
  household_id IS NOT NULL
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS private_inventory_items_select_self
ON public.private_inventory_items;
CREATE POLICY private_inventory_items_select_self
ON public.private_inventory_items
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS private_inventory_items_insert_self
ON public.private_inventory_items;
CREATE POLICY private_inventory_items_insert_self
ON public.private_inventory_items
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS private_inventory_items_update_self
ON public.private_inventory_items;
CREATE POLICY private_inventory_items_update_self
ON public.private_inventory_items
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS fridge_items_select_members ON public.fridge_items;
CREATE POLICY fridge_items_select_members
ON public.fridge_items
FOR SELECT
TO authenticated
USING (private.is_household_member(household_id));

DROP POLICY IF EXISTS fridge_items_insert_members ON public.fridge_items;
CREATE POLICY fridge_items_insert_members
ON public.fridge_items
FOR INSERT
TO authenticated
WITH CHECK (
  added_by = auth.uid()
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS fridge_items_update_creator ON public.fridge_items;
CREATE POLICY fridge_items_update_creator
ON public.fridge_items
FOR UPDATE
TO authenticated
USING (
  added_by = auth.uid()
  AND private.is_household_member(household_id)
)
WITH CHECK (
  added_by = auth.uid()
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS diary_entries_select_self ON public.diary_entries;
CREATE POLICY diary_entries_select_self
ON public.diary_entries
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS diary_entries_insert_self ON public.diary_entries;
CREATE POLICY diary_entries_insert_self
ON public.diary_entries
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS daily_summaries_select_self ON public.daily_summaries;
CREATE POLICY daily_summaries_select_self
ON public.daily_summaries
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_capture_sessions_select_self
ON public.ai_capture_sessions;
CREATE POLICY ai_capture_sessions_select_self
ON public.ai_capture_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_capture_sessions_insert_self
ON public.ai_capture_sessions;
CREATE POLICY ai_capture_sessions_insert_self
ON public.ai_capture_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ai_capture_sessions_update_self
ON public.ai_capture_sessions;
CREATE POLICY ai_capture_sessions_update_self
ON public.ai_capture_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

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
      AND s.user_id = auth.uid()
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
      AND s.user_id = auth.uid()
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
      AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ai_capture_sessions AS s
    WHERE s.id = ai_capture_items.session_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS dish_batches_select_members ON public.dish_batches;
CREATE POLICY dish_batches_select_members
ON public.dish_batches
FOR SELECT
TO authenticated
USING (private.is_household_member(household_id));

DROP POLICY IF EXISTS dish_batches_insert_members ON public.dish_batches;
CREATE POLICY dish_batches_insert_members
ON public.dish_batches
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS dish_batches_update_creator ON public.dish_batches;
CREATE POLICY dish_batches_update_creator
ON public.dish_batches
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND private.is_household_member(household_id)
)
WITH CHECK (
  created_by = auth.uid()
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS dish_batch_ingredients_select_members
ON public.dish_batch_ingredients;
CREATE POLICY dish_batch_ingredients_select_members
ON public.dish_batch_ingredients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.dish_batches AS db
    WHERE db.id = dish_batch_ingredients.dish_batch_id
      AND private.is_household_member(db.household_id)
  )
);

DROP POLICY IF EXISTS dish_batch_ingredients_insert_members
ON public.dish_batch_ingredients;
CREATE POLICY dish_batch_ingredients_insert_members
ON public.dish_batch_ingredients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.dish_batches AS db
    WHERE db.id = dish_batch_ingredients.dish_batch_id
      AND private.is_household_member(db.household_id)
  )
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
      AND db.created_by = auth.uid()
      AND private.is_household_member(db.household_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.dish_batches AS db
    WHERE db.id = dish_batch_ingredients.dish_batch_id
      AND db.created_by = auth.uid()
      AND private.is_household_member(db.household_id)
  )
);

DROP POLICY IF EXISTS serve_split_events_select_members
ON public.serve_split_events;
CREATE POLICY serve_split_events_select_members
ON public.serve_split_events
FOR SELECT
TO authenticated
USING (private.is_household_member(household_id));

DROP POLICY IF EXISTS serve_split_events_insert_members
ON public.serve_split_events;
CREATE POLICY serve_split_events_insert_members
ON public.serve_split_events
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND private.is_household_member(household_id)
);

DROP POLICY IF EXISTS serve_split_portions_select_members
ON public.serve_split_portions;
CREATE POLICY serve_split_portions_select_members
ON public.serve_split_portions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.serve_split_events AS sse
    WHERE sse.id = serve_split_portions.event_id
      AND private.is_household_member(sse.household_id)
  )
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
        sse.created_by = auth.uid()
        OR serve_split_portions.user_id = auth.uid()
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
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.serve_split_events AS sse
    WHERE sse.id = serve_split_portions.event_id
      AND private.is_household_member(sse.household_id)
  )
)
WITH CHECK (
  user_id = auth.uid()
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
  (owner_scope = 'personal' AND owner_user_id = auth.uid())
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
  (owner_scope = 'personal' AND owner_user_id = auth.uid())
  OR (
    owner_scope = 'household'
    AND owner_household_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = recipe_templates.owner_household_id
        AND h.owner_id = auth.uid()
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
  (owner_scope = 'personal' AND owner_user_id = auth.uid())
  OR (
    owner_scope = 'household'
    AND owner_household_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = recipe_templates.owner_household_id
        AND h.owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  (owner_scope = 'personal' AND owner_user_id = auth.uid())
  OR (
    owner_scope = 'household'
    AND owner_household_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.households AS h
      WHERE h.id = recipe_templates.owner_household_id
        AND h.owner_id = auth.uid()
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
        (rt.owner_scope = 'personal' AND rt.owner_user_id = auth.uid())
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
        (rt.owner_scope = 'personal' AND rt.owner_user_id = auth.uid())
        OR (
          rt.owner_scope = 'household'
          AND rt.owner_household_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.households AS h
            WHERE h.id = rt.owner_household_id
              AND h.owner_id = auth.uid()
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
        (rt.owner_scope = 'personal' AND rt.owner_user_id = auth.uid())
        OR (
          rt.owner_scope = 'household'
          AND rt.owner_household_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.households AS h
            WHERE h.id = rt.owner_household_id
              AND h.owner_id = auth.uid()
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
        (rt.owner_scope = 'personal' AND rt.owner_user_id = auth.uid())
        OR (
          rt.owner_scope = 'household'
          AND rt.owner_household_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.households AS h
            WHERE h.id = rt.owner_household_id
              AND h.owner_id = auth.uid()
          )
        )
      )
  )
);
