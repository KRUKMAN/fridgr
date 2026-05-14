-- Close direct authenticated inventory writes.
--
-- Fridge/private inventory mutations must go through Edge Functions so the
-- server can enforce validation, events, and idempotency. The service role used
-- by Edge Functions bypasses RLS, while authenticated clients keep read access.

DROP POLICY IF EXISTS private_inventory_items_insert_self
ON public.private_inventory_items;

DROP POLICY IF EXISTS private_inventory_items_update_self
ON public.private_inventory_items;

DROP POLICY IF EXISTS fridge_items_insert_members
ON public.fridge_items;

DROP POLICY IF EXISTS fridge_items_update_creator
ON public.fridge_items;
