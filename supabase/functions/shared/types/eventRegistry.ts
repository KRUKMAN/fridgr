import { z } from 'zod';

export const BASE_UNIT_VALUES = ['mass_mg', 'volume_ml', 'count_each'] as const;
export const SOURCE_TYPE_VALUES = [
  'barcode_scan',
  'receipt_parse',
  'voice_parse',
  'manual_add',
] as const;
export const CAPTURE_TYPE_VALUES = ['barcode', 'receipt', 'voice'] as const;
export const OUTPUT_SCOPE_VALUES = ['private_inventory', 'fridge'] as const;
export const SOURCE_SCOPE_VALUES = [
  'global',
  'personal',
  'household',
  'private_inventory',
  'fridge',
  'dish_batch',
  'quick_estimate',
] as const;

const BaseUnitSchema = z.enum(BASE_UNIT_VALUES);
const SourceTypeSchema = z.enum(SOURCE_TYPE_VALUES);
const CaptureTypeSchema = z.enum(CAPTURE_TYPE_VALUES);
const OutputScopeSchema = z.enum(OUTPUT_SCOPE_VALUES);
const SourceScopeSchema = z.enum(SOURCE_SCOPE_VALUES);
const UuidSchema = z.string().uuid();

export const EVENT_TYPES = {
  FRIDGE_ITEM_ADDED: 'FridgeItemAdded',
  FRIDGE_ITEM_CONSUMED: 'FridgeItemConsumed',
  FRIDGE_ITEM_WASTED: 'FridgeItemWasted',
  PRIVATE_INVENTORY_ITEM_ADDED: 'PrivateInventoryItemAdded',
  PRIVATE_INVENTORY_ITEM_CONSUMED: 'PrivateInventoryItemConsumed',
  DIARY_ENTRY_CREATED: 'DiaryEntryCreated',
  DIARY_ENTRY_CORRECTED: 'DiaryEntryCorrected',
  DISH_BATCH_CREATED: 'DishBatchCreated',
  SERVE_SPLIT_CREATED: 'ServeSplitCreated',
  SERVE_SPLIT_COMPLETED: 'ServeSplitCompleted',
  AI_SUBMISSION_CONFIRMED: 'AiSubmissionConfirmed',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export const EventTypeSchema = z.enum(Object.values(EVENT_TYPES) as [EventType, ...EventType[]]);

export const FridgeItemAddedSchema = z
  .object({
    fridge_item_id: UuidSchema,
    snapshot_food_name: z.string().min(1),
    quantity_base: z.number().int().positive(),
    base_unit: BaseUnitSchema,
    source_type: SourceTypeSchema,
  })
  .strict();

export type FridgeItemAddedPayload = z.infer<typeof FridgeItemAddedSchema>;

export const FridgeItemConsumedSchema = z
  .object({
    fridge_item_id: UuidSchema,
    quantity_consumed: z.number().int().positive(),
    base_unit: BaseUnitSchema,
    remaining_quantity: z.number().int().nonnegative(),
    diary_entry_id: UuidSchema.optional(),
  })
  .strict();

export type FridgeItemConsumedPayload = z.infer<typeof FridgeItemConsumedSchema>;

export const FridgeItemWastedSchema = z
  .object({
    fridge_item_id: UuidSchema,
    quantity_wasted: z.number().int().positive(),
    base_unit: BaseUnitSchema,
    remaining_quantity: z.number().int().nonnegative(),
    reason: z.string().min(1).optional(),
  })
  .strict();

export type FridgeItemWastedPayload = z.infer<typeof FridgeItemWastedSchema>;

export const PrivateInventoryItemAddedSchema = z
  .object({
    item_id: UuidSchema,
    snapshot_food_name: z.string().min(1),
    quantity_base: z.number().int().positive(),
    base_unit: BaseUnitSchema,
    source_type: SourceTypeSchema,
  })
  .strict();

export type PrivateInventoryItemAddedPayload = z.infer<typeof PrivateInventoryItemAddedSchema>;

export const PrivateInventoryItemConsumedSchema = z
  .object({
    item_id: UuidSchema,
    quantity_consumed: z.number().int().positive(),
    base_unit: BaseUnitSchema,
    remaining_quantity: z.number().int().nonnegative(),
    diary_entry_id: UuidSchema.optional(),
  })
  .strict();

export type PrivateInventoryItemConsumedPayload = z.infer<
  typeof PrivateInventoryItemConsumedSchema
>;

export const DiaryEntryCreatedSchema = z
  .object({
    diary_entry_id: UuidSchema,
    food_name: z.string().min(1),
    source_scope: SourceScopeSchema,
    quantity_base: z.number().int().positive(),
    base_unit: BaseUnitSchema,
    kcal: z.number().int().nonnegative(),
  })
  .strict();

export type DiaryEntryCreatedPayload = z.infer<typeof DiaryEntryCreatedSchema>;

export const DiaryEntryCorrectedSchema = z
  .object({
    correction_entry_id: UuidSchema,
    original_entry_id: UuidSchema,
    delta_kcal: z.number().int(),
    delta_protein_mg: z.number().int(),
    delta_carbs_mg: z.number().int(),
    delta_fat_mg: z.number().int(),
  })
  .strict();

export type DiaryEntryCorrectedPayload = z.infer<typeof DiaryEntryCorrectedSchema>;

export const DishBatchCreatedSchema = z
  .object({
    dish_batch_id: UuidSchema,
    name: z.string().min(1),
    ingredient_count: z.number().int().nonnegative(),
    output_scope: OutputScopeSchema,
    total_kcal: z.number().int().nonnegative(),
  })
  .strict();

export type DishBatchCreatedPayload = z.infer<typeof DishBatchCreatedSchema>;

export const ServeSplitCreatedSchema = z
  .object({
    serve_split_id: UuidSchema,
    dish_batch_id: UuidSchema,
    portion_count: z.number().int().positive(),
    recipient_user_ids: z.array(UuidSchema),
  })
  .strict();

export type ServeSplitCreatedPayload = z.infer<typeof ServeSplitCreatedSchema>;

export const ServeSplitCompletedSchema = z
  .object({
    serve_split_id: UuidSchema,
    accepted_count: z.number().int().nonnegative(),
    declined_count: z.number().int().nonnegative(),
  })
  .strict();

export type ServeSplitCompletedPayload = z.infer<typeof ServeSplitCompletedSchema>;

export const AiSubmissionConfirmedSchema = z
  .object({
    capture_type: CaptureTypeSchema,
    item_count: z.number().int().nonnegative(),
    unresolved_count: z.number().int().nonnegative(),
    confirmation_latency_ms: z.number().int().nonnegative(),
  })
  .strict();

export type AiSubmissionConfirmedPayload = z.infer<typeof AiSubmissionConfirmedSchema>;

export interface EventPayloadMap {
  FridgeItemAdded: FridgeItemAddedPayload;
  FridgeItemConsumed: FridgeItemConsumedPayload;
  FridgeItemWasted: FridgeItemWastedPayload;
  PrivateInventoryItemAdded: PrivateInventoryItemAddedPayload;
  PrivateInventoryItemConsumed: PrivateInventoryItemConsumedPayload;
  DiaryEntryCreated: DiaryEntryCreatedPayload;
  DiaryEntryCorrected: DiaryEntryCorrectedPayload;
  DishBatchCreated: DishBatchCreatedPayload;
  ServeSplitCreated: ServeSplitCreatedPayload;
  ServeSplitCompleted: ServeSplitCompletedPayload;
  AiSubmissionConfirmed: AiSubmissionConfirmedPayload;
}

export const EventSchemaMap = {
  FridgeItemAdded: FridgeItemAddedSchema,
  FridgeItemConsumed: FridgeItemConsumedSchema,
  FridgeItemWasted: FridgeItemWastedSchema,
  PrivateInventoryItemAdded: PrivateInventoryItemAddedSchema,
  PrivateInventoryItemConsumed: PrivateInventoryItemConsumedSchema,
  DiaryEntryCreated: DiaryEntryCreatedSchema,
  DiaryEntryCorrected: DiaryEntryCorrectedSchema,
  DishBatchCreated: DishBatchCreatedSchema,
  ServeSplitCreated: ServeSplitCreatedSchema,
  ServeSplitCompleted: ServeSplitCompletedSchema,
  AiSubmissionConfirmed: AiSubmissionConfirmedSchema,
} satisfies {
  [K in EventType]: z.ZodType<EventPayloadMap[K]>;
};

