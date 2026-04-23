import { z } from 'npm:zod@3.25.76';

import {
  BaseUnit,
  QuantityBase,
  UuidV4,
} from '../../helpers/validate.ts';
import { CaptureTypeSchema, SourceTypeSchema, type DomainEventType } from '../events.ts';

export const fridgeItemAddedSchema = z
  .object({
    base_unit: BaseUnit,
    fridge_item_id: UuidV4,
    quantity_base: QuantityBase,
    snapshot_food_name: z.string().trim().min(1),
    source_type: SourceTypeSchema,
  })
  .strict();

export const fridgeItemConsumedSchema = z
  .object({
    base_unit: BaseUnit,
    diary_entry_id: UuidV4.optional(),
    fridge_item_id: UuidV4,
    quantity_consumed: QuantityBase,
    remaining_quantity: z.number().int().nonnegative(),
  })
  .strict();

export const fridgeItemWastedSchema = z
  .object({
    base_unit: BaseUnit,
    fridge_item_id: UuidV4,
    quantity_wasted: QuantityBase,
    reason: z.string().trim().min(1).optional(),
    remaining_quantity: z.number().int().nonnegative(),
  })
  .strict();

export const privateInventoryItemAddedSchema = z
  .object({
    base_unit: BaseUnit,
    item_id: UuidV4,
    quantity_base: QuantityBase,
    snapshot_food_name: z.string().trim().min(1),
    source_type: SourceTypeSchema,
  })
  .strict();

export const privateInventoryItemConsumedSchema = z
  .object({
    base_unit: BaseUnit,
    diary_entry_id: UuidV4.optional(),
    item_id: UuidV4,
    quantity_consumed: QuantityBase,
    remaining_quantity: z.number().int().nonnegative(),
  })
  .strict();

export const diaryEntryCreatedSchema = z
  .object({
    base_unit: BaseUnit,
    diary_entry_id: UuidV4,
    food_name: z.string().trim().min(1),
    kcal: z.number().nonnegative(),
    quantity_base: QuantityBase,
    source_scope: z.string().trim().min(1),
  })
  .strict();

export const diaryEntryCorrectedSchema = z
  .object({
    correction_entry_id: UuidV4,
    delta_carbs_mg: z.number().int(),
    delta_fat_mg: z.number().int(),
    delta_kcal: z.number(),
    delta_protein_mg: z.number().int(),
    original_entry_id: UuidV4,
  })
  .strict();

export const dishBatchCreatedSchema = z
  .object({
    dish_batch_id: UuidV4,
    ingredient_count: z.number().int().positive(),
    name: z.string().trim().min(1),
    output_scope: z.enum(['private', 'fridge']),
    total_kcal: z.number().nonnegative(),
  })
  .strict();

export const serveSplitCreatedSchema = z
  .object({
    dish_batch_id: UuidV4,
    event_id: UuidV4,
    portion_count: z.number().int().positive(),
    recipient_user_ids: z.array(UuidV4).min(1),
  })
  .strict();

export const serveSplitCompletedSchema = z
  .object({
    accepted_count: z.number().int().nonnegative(),
    declined_count: z.number().int().nonnegative(),
    event_id: UuidV4,
  })
  .strict();

export const aiSubmissionConfirmedSchema = z
  .object({
    capture_type: CaptureTypeSchema,
    confirmation_latency_ms: z.number().int().nonnegative(),
    item_count: z.number().int().nonnegative(),
    unresolved_count: z.number().int().nonnegative(),
  })
  .strict();

export const eventSchemas = {
  AiSubmissionConfirmed: aiSubmissionConfirmedSchema,
  DiaryEntryCorrected: diaryEntryCorrectedSchema,
  DiaryEntryCreated: diaryEntryCreatedSchema,
  DishBatchCreated: dishBatchCreatedSchema,
  FridgeItemAdded: fridgeItemAddedSchema,
  FridgeItemConsumed: fridgeItemConsumedSchema,
  FridgeItemWasted: fridgeItemWastedSchema,
  PrivateInventoryItemAdded: privateInventoryItemAddedSchema,
  PrivateInventoryItemConsumed: privateInventoryItemConsumedSchema,
  ServeSplitCompleted: serveSplitCompletedSchema,
  ServeSplitCreated: serveSplitCreatedSchema,
} satisfies Record<DomainEventType, z.ZodTypeAny>;
