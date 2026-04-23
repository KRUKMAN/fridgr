CREATE TABLE `ai_capture_items` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`raw_text` text,
	`resolved_scope` text,
	`resolved_food_id` text,
	`resolved_variation_id` text,
	`quantity_raw` text,
	`quantity_base` integer,
	`base_unit` text,
	`confidence` real NOT NULL,
	`suggested_destination` text,
	`action` text,
	`committed_diary_entry_id` text,
	`committed_inventory_item_id` text,
	`commit_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "ai_capture_items_resolved_scope_check" CHECK("ai_capture_items"."resolved_scope" IS NULL OR "ai_capture_items"."resolved_scope" IN ('global', 'personal', 'household', 'variation', 'unknown')),
	CONSTRAINT "ai_capture_items_base_unit_check" CHECK("ai_capture_items"."base_unit" IS NULL OR "ai_capture_items"."base_unit" IN ('mass_mg', 'volume_ml', 'count_each')),
	CONSTRAINT "ai_capture_items_suggested_destination_check" CHECK("ai_capture_items"."suggested_destination" IS NULL OR "ai_capture_items"."suggested_destination" IN ('private_inventory', 'fridge', 'diary', 'none'))
);
--> statement-breakpoint
CREATE TABLE `ai_capture_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`capture_type` text NOT NULL,
	`source_image_url` text,
	`raw_text` text,
	`status` text NOT NULL,
	`error_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`committed_at` text,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "ai_capture_sessions_capture_type_check" CHECK("ai_capture_sessions"."capture_type" IN ('receipt', 'voice', 'barcode')),
	CONSTRAINT "ai_capture_sessions_status_check" CHECK("ai_capture_sessions"."status" IN ('parsing', 'parsed', 'clarifying', 'pending_confirmation', 'committed', 'canceled'))
);
--> statement-breakpoint
CREATE TABLE `daily_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`total_kcal` integer DEFAULT 0 NOT NULL,
	`total_protein_mg` integer DEFAULT 0 NOT NULL,
	`total_carbs_mg` integer DEFAULT 0 NOT NULL,
	`total_fat_mg` integer DEFAULT 0 NOT NULL,
	`entry_count` integer DEFAULT 0 NOT NULL,
	`synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_summaries_user_id_date_key` ON `daily_summaries` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `diary_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`food_name` text NOT NULL,
	`source_scope` text NOT NULL,
	`source_global_food_id` text,
	`source_personal_food_id` text,
	`source_household_food_item_id` text,
	`source_private_inventory_item_id` text,
	`source_fridge_item_id` text,
	`source_dish_batch_id` text,
	`quantity_base` integer NOT NULL,
	`base_unit` text NOT NULL,
	`kcal` integer NOT NULL,
	`protein_mg` integer NOT NULL,
	`carbs_mg` integer NOT NULL,
	`fat_mg` integer NOT NULL,
	`source` text,
	`confidence` real,
	`is_quick_estimate` integer DEFAULT false NOT NULL,
	`is_correction` integer DEFAULT false NOT NULL,
	`corrects_entry_id` text,
	`serve_split_event_id` text,
	`logged_at` text NOT NULL,
	`created_at` text NOT NULL,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "diary_entries_source_scope_check" CHECK("diary_entries"."source_scope" IN ('global', 'personal', 'household', 'private_inventory', 'fridge', 'dish_batch', 'quick_estimate')),
	CONSTRAINT "diary_entries_base_unit_check" CHECK("diary_entries"."base_unit" IN ('mass_mg', 'volume_ml', 'count_each')),
	CONSTRAINT "diary_entries_correction_check" CHECK("diary_entries"."is_correction" = 0 OR "diary_entries"."corrects_entry_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE `dish_batch_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`dish_batch_id` text NOT NULL,
	`source_private_inventory_item_id` text,
	`source_fridge_item_id` text,
	`source_snapshot_food_name` text NOT NULL,
	`quantity_used_base` integer NOT NULL,
	`base_unit` text NOT NULL,
	`kcal_contributed` integer NOT NULL,
	`protein_mg_contributed` integer NOT NULL,
	`carbs_mg_contributed` integer NOT NULL,
	`fat_mg_contributed` integer NOT NULL,
	`created_at` text NOT NULL,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "dish_batch_ingredients_exactly_one_source_check" CHECK((
        (CASE WHEN "dish_batch_ingredients"."source_private_inventory_item_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "dish_batch_ingredients"."source_fridge_item_id" IS NOT NULL THEN 1 ELSE 0 END)
      ) = 1),
	CONSTRAINT "dish_batch_ingredients_quantity_used_base_check" CHECK("dish_batch_ingredients"."quantity_used_base" > 0),
	CONSTRAINT "dish_batch_ingredients_base_unit_check" CHECK("dish_batch_ingredients"."base_unit" IN ('mass_mg', 'volume_ml', 'count_each')),
	CONSTRAINT "dish_batch_ingredients_kcal_contributed_check" CHECK("dish_batch_ingredients"."kcal_contributed" >= 0),
	CONSTRAINT "dish_batch_ingredients_protein_mg_contributed_check" CHECK("dish_batch_ingredients"."protein_mg_contributed" >= 0),
	CONSTRAINT "dish_batch_ingredients_carbs_mg_contributed_check" CHECK("dish_batch_ingredients"."carbs_mg_contributed" >= 0),
	CONSTRAINT "dish_batch_ingredients_fat_mg_contributed_check" CHECK("dish_batch_ingredients"."fat_mg_contributed" >= 0)
);
--> statement-breakpoint
CREATE TABLE `dish_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`created_by` text NOT NULL,
	`recipe_template_id` text,
	`household_food_item_id` text,
	`name` text NOT NULL,
	`output_inventory_scope` text NOT NULL,
	`output_inventory_item_id` text,
	`output_quantity_base` integer NOT NULL,
	`base_unit` text NOT NULL,
	`nutrition_basis` text NOT NULL,
	`kcal_total` integer NOT NULL,
	`protein_mg_total` integer NOT NULL,
	`carbs_mg_total` integer NOT NULL,
	`fat_mg_total` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "dish_batches_output_inventory_scope_check" CHECK("dish_batches"."output_inventory_scope" IN ('private_inventory', 'fridge')),
	CONSTRAINT "dish_batches_output_quantity_base_check" CHECK("dish_batches"."output_quantity_base" > 0),
	CONSTRAINT "dish_batches_base_unit_check" CHECK("dish_batches"."base_unit" IN ('mass_mg', 'volume_ml', 'count_each')),
	CONSTRAINT "dish_batches_nutrition_basis_check" CHECK("dish_batches"."nutrition_basis" IN ('per_100g', 'per_100ml')),
	CONSTRAINT "dish_batches_kcal_total_check" CHECK("dish_batches"."kcal_total" >= 0),
	CONSTRAINT "dish_batches_protein_mg_total_check" CHECK("dish_batches"."protein_mg_total" >= 0),
	CONSTRAINT "dish_batches_carbs_mg_total_check" CHECK("dish_batches"."carbs_mg_total" >= 0),
	CONSTRAINT "dish_batches_fat_mg_total_check" CHECK("dish_batches"."fat_mg_total" >= 0),
	CONSTRAINT "dish_batches_status_check" CHECK("dish_batches"."status" IN ('draft', 'finalized', 'partially_consumed', 'consumed', 'discarded'))
);
--> statement-breakpoint
CREATE TABLE `food_variations` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_food_id` text,
	`created_by` text NOT NULL,
	`household_id` text,
	`scope` text DEFAULT 'personal' NOT NULL,
	`status` text DEFAULT 'unresolved' NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`barcode` text,
	`category` text,
	`nutrition_basis` text DEFAULT 'per_100g' NOT NULL,
	`density_mg_per_ml` integer,
	`kcal_per_100_unit` integer,
	`protein_mg_per_100_unit` integer,
	`carbs_mg_per_100_unit` integer,
	`fat_mg_per_100_unit` integer,
	`image_url` text,
	`notes` text,
	`evidence_count` integer DEFAULT 0 NOT NULL,
	`source_context` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "food_variations_scope_check" CHECK("food_variations"."scope" IN ('personal', 'household', 'community')),
	CONSTRAINT "food_variations_status_check" CHECK("food_variations"."status" IN ('unresolved', 'confirmed', 'promoted')),
	CONSTRAINT "food_variations_nutrition_basis_check" CHECK("food_variations"."nutrition_basis" IN ('per_100g', 'per_100ml')),
	CONSTRAINT "food_variations_source_context_check" CHECK("food_variations"."source_context" IS NULL OR "food_variations"."source_context" IN ('receipt_parse', 'voice_parse', 'manual_add', 'barcode_scan'))
);
--> statement-breakpoint
CREATE TABLE `fridge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`global_food_id` text,
	`personal_food_id` text,
	`household_food_item_id` text,
	`dish_batch_id` text,
	`food_variation_id` text,
	`snapshot_food_name` text NOT NULL,
	`snapshot_nutrition_basis` text NOT NULL,
	`snapshot_kcal_per_100_unit` integer NOT NULL,
	`snapshot_protein_mg_per_100_unit` integer NOT NULL,
	`snapshot_carbs_mg_per_100_unit` integer NOT NULL,
	`snapshot_fat_mg_per_100_unit` integer NOT NULL,
	`snapshot_category` text,
	`snapshot_density_mg_per_ml` integer,
	`quantity_base` integer NOT NULL,
	`base_unit` text NOT NULL,
	`unit_display` text NOT NULL,
	`estimated_expiry` text,
	`version` integer DEFAULT 1 NOT NULL,
	`added_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "fridge_items_snapshot_nutrition_basis_check" CHECK("fridge_items"."snapshot_nutrition_basis" IN ('per_100g', 'per_100ml')),
	CONSTRAINT "fridge_items_quantity_base_check" CHECK("fridge_items"."quantity_base" > 0),
	CONSTRAINT "fridge_items_base_unit_check" CHECK("fridge_items"."base_unit" IN ('mass_mg', 'volume_ml', 'count_each')),
	CONSTRAINT "fridge_items_exactly_one_source_check" CHECK((
        (CASE WHEN "fridge_items"."global_food_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "fridge_items"."personal_food_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "fridge_items"."household_food_item_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "fridge_items"."dish_batch_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "fridge_items"."food_variation_id" IS NOT NULL THEN 1 ELSE 0 END)
      ) = 1)
);
--> statement-breakpoint
CREATE TABLE `global_food_items` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_name` text NOT NULL,
	`brand` text,
	`barcode` text,
	`category` text NOT NULL,
	`nutrition_basis` text DEFAULT 'per_100g' NOT NULL,
	`density_mg_per_ml` integer,
	`kcal_per_100_unit` integer NOT NULL,
	`protein_mg_per_100_unit` integer NOT NULL,
	`carbs_mg_per_100_unit` integer NOT NULL,
	`fat_mg_per_100_unit` integer NOT NULL,
	`fiber_mg_per_100_unit` integer,
	`default_serving_g` integer,
	`default_shelf_life_days` integer,
	`source_type` text NOT NULL,
	`quality_score` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`synced_at` text NOT NULL,
	CONSTRAINT "global_food_items_nutrition_basis_check" CHECK("global_food_items"."nutrition_basis" IN ('per_100g', 'per_100ml')),
	CONSTRAINT "global_food_items_source_type_check" CHECK("global_food_items"."source_type" IN ('imported', 'verified_user_submission', 'curated'))
);
--> statement-breakpoint
CREATE TABLE `household_food_items` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`created_by` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`source_global_food_id` text,
	`source_personal_food_id` text,
	`nutrition_basis` text DEFAULT 'per_100g' NOT NULL,
	`density_mg_per_ml` integer,
	`kcal_per_100_unit` integer NOT NULL,
	`protein_mg_per_100_unit` integer NOT NULL,
	`carbs_mg_per_100_unit` integer NOT NULL,
	`fat_mg_per_100_unit` integer NOT NULL,
	`default_unit_display` text,
	`sharing_mode` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "household_food_items_kind_check" CHECK("household_food_items"."kind" IN ('product', 'dish')),
	CONSTRAINT "household_food_items_nutrition_basis_check" CHECK("household_food_items"."nutrition_basis" IN ('per_100g', 'per_100ml')),
	CONSTRAINT "household_food_items_sharing_mode_check" CHECK("household_food_items"."sharing_mode" IN ('direct', 'promoted_from_personal', 'promoted_from_global', 'generated_from_recipe'))
);
--> statement-breakpoint
CREATE TABLE `household_members` (
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` text NOT NULL,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	PRIMARY KEY(`household_id`, `user_id`),
	CONSTRAINT "household_members_role_check" CHECK("household_members"."role" IN ('owner', 'member'))
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`invite_code` text,
	`created_at` text NOT NULL,
	`archived_at` text,
	`synced_at` text NOT NULL,
	`_pending_mutation` text
);
--> statement-breakpoint
CREATE TABLE `personal_food_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`nutrition_basis` text DEFAULT 'per_100g' NOT NULL,
	`density_mg_per_ml` integer,
	`kcal_per_100_unit` integer NOT NULL,
	`protein_mg_per_100_unit` integer NOT NULL,
	`carbs_mg_per_100_unit` integer NOT NULL,
	`fat_mg_per_100_unit` integer NOT NULL,
	`linked_global_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "personal_food_items_nutrition_basis_check" CHECK("personal_food_items"."nutrition_basis" IN ('per_100g', 'per_100ml'))
);
--> statement-breakpoint
CREATE TABLE `private_inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`global_food_id` text,
	`personal_food_id` text,
	`household_food_item_id` text,
	`dish_batch_id` text,
	`food_variation_id` text,
	`snapshot_food_name` text NOT NULL,
	`snapshot_nutrition_basis` text NOT NULL,
	`snapshot_kcal_per_100_unit` integer NOT NULL,
	`snapshot_protein_mg_per_100_unit` integer NOT NULL,
	`snapshot_carbs_mg_per_100_unit` integer NOT NULL,
	`snapshot_fat_mg_per_100_unit` integer NOT NULL,
	`snapshot_category` text,
	`snapshot_density_mg_per_ml` integer,
	`quantity_base` integer NOT NULL,
	`base_unit` text NOT NULL,
	`unit_display` text NOT NULL,
	`storage_label` text,
	`estimated_expiry` text,
	`version` integer DEFAULT 1 NOT NULL,
	`added_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "private_inventory_items_snapshot_nutrition_basis_check" CHECK("private_inventory_items"."snapshot_nutrition_basis" IN ('per_100g', 'per_100ml')),
	CONSTRAINT "private_inventory_items_quantity_base_check" CHECK("private_inventory_items"."quantity_base" > 0),
	CONSTRAINT "private_inventory_items_base_unit_check" CHECK("private_inventory_items"."base_unit" IN ('mass_mg', 'volume_ml', 'count_each')),
	CONSTRAINT "private_inventory_items_exactly_one_source_check" CHECK((
        (CASE WHEN "private_inventory_items"."global_food_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "private_inventory_items"."personal_food_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "private_inventory_items"."household_food_item_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "private_inventory_items"."dish_batch_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "private_inventory_items"."food_variation_id" IS NOT NULL THEN 1 ELSE 0 END)
      ) = 1)
);
--> statement-breakpoint
CREATE TABLE `recipe_template_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_template_id` text NOT NULL,
	`preferred_scope` text NOT NULL,
	`global_food_id` text,
	`personal_food_id` text,
	`household_food_item_id` text,
	`quantity_base` integer NOT NULL,
	`base_unit` text NOT NULL,
	`created_at` text NOT NULL,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "recipe_template_ingredients_preferred_scope_check" CHECK("recipe_template_ingredients"."preferred_scope" IN ('global', 'personal', 'household')),
	CONSTRAINT "recipe_template_ingredients_matching_source_check" CHECK((
        ("recipe_template_ingredients"."preferred_scope" = 'global' AND "recipe_template_ingredients"."global_food_id" IS NOT NULL AND "recipe_template_ingredients"."personal_food_id" IS NULL AND "recipe_template_ingredients"."household_food_item_id" IS NULL) OR
        ("recipe_template_ingredients"."preferred_scope" = 'personal' AND "recipe_template_ingredients"."global_food_id" IS NULL AND "recipe_template_ingredients"."personal_food_id" IS NOT NULL AND "recipe_template_ingredients"."household_food_item_id" IS NULL) OR
        ("recipe_template_ingredients"."preferred_scope" = 'household' AND "recipe_template_ingredients"."global_food_id" IS NULL AND "recipe_template_ingredients"."personal_food_id" IS NULL AND "recipe_template_ingredients"."household_food_item_id" IS NOT NULL)
      )),
	CONSTRAINT "recipe_template_ingredients_quantity_base_check" CHECK("recipe_template_ingredients"."quantity_base" > 0),
	CONSTRAINT "recipe_template_ingredients_base_unit_check" CHECK("recipe_template_ingredients"."base_unit" IN ('mass_mg', 'volume_ml', 'count_each'))
);
--> statement-breakpoint
CREATE TABLE `recipe_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_scope` text NOT NULL,
	`owner_user_id` text,
	`owner_household_id` text,
	`household_food_item_id` text,
	`name` text NOT NULL,
	`default_output_quantity_base` integer,
	`default_output_base_unit` text,
	`notes` text,
	`created_from_dish_batch_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "recipe_templates_owner_scope_check" CHECK("recipe_templates"."owner_scope" IN ('personal', 'household')),
	CONSTRAINT "recipe_templates_owner_check" CHECK((
        ("recipe_templates"."owner_scope" = 'personal' AND "recipe_templates"."owner_user_id" IS NOT NULL AND "recipe_templates"."owner_household_id" IS NULL) OR
        ("recipe_templates"."owner_scope" = 'household' AND "recipe_templates"."owner_household_id" IS NOT NULL)
      )),
	CONSTRAINT "recipe_templates_default_output_quantity_base_check" CHECK("recipe_templates"."default_output_quantity_base" IS NULL OR "recipe_templates"."default_output_quantity_base" > 0),
	CONSTRAINT "recipe_templates_default_output_base_unit_check" CHECK("recipe_templates"."default_output_base_unit" IS NULL OR "recipe_templates"."default_output_base_unit" IN ('mass_mg', 'volume_ml', 'count_each')),
	CONSTRAINT "recipe_templates_default_output_pair_check" CHECK((
        ("recipe_templates"."default_output_quantity_base" IS NULL AND "recipe_templates"."default_output_base_unit" IS NULL) OR
        ("recipe_templates"."default_output_quantity_base" IS NOT NULL AND "recipe_templates"."default_output_base_unit" IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE `serve_split_events` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`created_by` text NOT NULL,
	`dish_batch_id` text NOT NULL,
	`total_quantity_base` integer NOT NULL,
	`base_unit` text NOT NULL,
	`total_kcal` integer NOT NULL,
	`total_protein_mg` integer NOT NULL,
	`total_carbs_mg` integer NOT NULL,
	`total_fat_mg` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "serve_split_events_total_quantity_base_check" CHECK("serve_split_events"."total_quantity_base" > 0),
	CONSTRAINT "serve_split_events_base_unit_check" CHECK("serve_split_events"."base_unit" IN ('mass_mg', 'volume_ml', 'count_each')),
	CONSTRAINT "serve_split_events_total_kcal_check" CHECK("serve_split_events"."total_kcal" >= 0),
	CONSTRAINT "serve_split_events_total_protein_mg_check" CHECK("serve_split_events"."total_protein_mg" >= 0),
	CONSTRAINT "serve_split_events_total_carbs_mg_check" CHECK("serve_split_events"."total_carbs_mg" >= 0),
	CONSTRAINT "serve_split_events_total_fat_mg_check" CHECK("serve_split_events"."total_fat_mg" >= 0),
	CONSTRAINT "serve_split_events_status_check" CHECK("serve_split_events"."status" IN ('pending', 'completed', 'expired'))
);
--> statement-breakpoint
CREATE TABLE `serve_split_portions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`percentage` real,
	`quantity_base` integer NOT NULL,
	`base_unit` text NOT NULL,
	`kcal` integer NOT NULL,
	`protein_mg` integer NOT NULL,
	`carbs_mg` integer NOT NULL,
	`fat_mg` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`diary_entry_id` text,
	`responded_at` text,
	`synced_at` text NOT NULL,
	`_pending_mutation` text,
	CONSTRAINT "serve_split_portions_percentage_check" CHECK("serve_split_portions"."percentage" IS NULL OR ("serve_split_portions"."percentage" > 0 AND "serve_split_portions"."percentage" <= 100)),
	CONSTRAINT "serve_split_portions_quantity_base_check" CHECK("serve_split_portions"."quantity_base" > 0),
	CONSTRAINT "serve_split_portions_base_unit_check" CHECK("serve_split_portions"."base_unit" IN ('mass_mg', 'volume_ml', 'count_each')),
	CONSTRAINT "serve_split_portions_kcal_check" CHECK("serve_split_portions"."kcal" >= 0),
	CONSTRAINT "serve_split_portions_protein_mg_check" CHECK("serve_split_portions"."protein_mg" >= 0),
	CONSTRAINT "serve_split_portions_carbs_mg_check" CHECK("serve_split_portions"."carbs_mg" >= 0),
	CONSTRAINT "serve_split_portions_fat_mg_check" CHECK("serve_split_portions"."fat_mg" >= 0),
	CONSTRAINT "serve_split_portions_status_check" CHECK("serve_split_portions"."status" IN ('pending', 'accepted', 'declined'))
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`display_name` text,
	`avatar_url` text,
	`target_kcal` integer DEFAULT 2000 NOT NULL,
	`target_protein_mg` integer,
	`target_carbs_mg` integer,
	`target_fat_mg` integer,
	`created_at` text NOT NULL,
	`last_active_at` text NOT NULL,
	`synced_at` text NOT NULL,
	`_pending_mutation` text
);
