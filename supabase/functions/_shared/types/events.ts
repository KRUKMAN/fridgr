import { z } from 'npm:zod@3.25.76';

export const DomainEventIdSchema = z.string().uuid().brand<'DomainEventId'>();
export const OperationIdSchema = z.string().uuid().brand<'OperationId'>();
export const ActorIdSchema = z.string().uuid().brand<'ActorId'>();
export const HouseholdIdSchema = z.string().uuid().brand<'HouseholdId'>();

export type DomainEventId = z.infer<typeof DomainEventIdSchema>;
export type OperationId = z.infer<typeof OperationIdSchema>;
export type ActorId = z.infer<typeof ActorIdSchema>;
export type HouseholdId = z.infer<typeof HouseholdIdSchema>;

export const BaseUnitSchema = z.enum(['mass_mg', 'volume_ml', 'count_each']);
export const SourceTypeSchema = z.enum([
  'barcode_scan',
  'receipt_parse',
  'voice_parse',
  'manual_add',
]);
export const CaptureTypeSchema = z.enum(['barcode', 'receipt', 'voice']);

export const DOMAIN_EVENT_TYPES = [
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
  'AiSubmissionConfirmed',
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export type FridgeItemAddedPayload = Readonly<{
  base_unit: z.infer<typeof BaseUnitSchema>;
  fridge_item_id: string;
  quantity_base: number;
  snapshot_food_name: string;
  source_type: z.infer<typeof SourceTypeSchema>;
}>;

export type FridgeItemConsumedPayload = Readonly<{
  base_unit: z.infer<typeof BaseUnitSchema>;
  diary_entry_id?: string;
  fridge_item_id: string;
  quantity_consumed: number;
  remaining_quantity: number;
}>;

export type FridgeItemWastedPayload = Readonly<{
  base_unit: z.infer<typeof BaseUnitSchema>;
  fridge_item_id: string;
  quantity_wasted: number;
  reason?: string;
  remaining_quantity: number;
}>;

export type PrivateInventoryItemAddedPayload = Readonly<{
  base_unit: z.infer<typeof BaseUnitSchema>;
  item_id: string;
  quantity_base: number;
  snapshot_food_name: string;
  source_type: z.infer<typeof SourceTypeSchema>;
}>;

export type PrivateInventoryItemConsumedPayload = Readonly<{
  base_unit: z.infer<typeof BaseUnitSchema>;
  diary_entry_id?: string;
  item_id: string;
  quantity_consumed: number;
  remaining_quantity: number;
}>;

export type DiaryEntryCreatedPayload = Readonly<{
  base_unit: z.infer<typeof BaseUnitSchema>;
  diary_entry_id: string;
  food_name: string;
  kcal: number;
  quantity_base: number;
  source_scope: string;
}>;

export type DiaryEntryCorrectedPayload = Readonly<{
  correction_entry_id: string;
  delta_carbs_mg: number;
  delta_fat_mg: number;
  delta_kcal: number;
  delta_protein_mg: number;
  original_entry_id: string;
}>;

export type DishBatchCreatedPayload = Readonly<{
  dish_batch_id: string;
  ingredient_count: number;
  name: string;
  output_scope: string;
  total_kcal: number;
}>;

export type ServeSplitCreatedPayload = Readonly<{
  dish_batch_id: string;
  event_id: string;
  portion_count: number;
  recipient_user_ids: readonly string[];
}>;

export type ServeSplitCompletedPayload = Readonly<{
  accepted_count: number;
  declined_count: number;
  event_id: string;
}>;

export type AiSubmissionConfirmedPayload = Readonly<{
  capture_type: z.infer<typeof CaptureTypeSchema>;
  confirmation_latency_ms: number;
  item_count: number;
  unresolved_count: number;
}>;

export type EventPayloadMap = {
  AiSubmissionConfirmed: AiSubmissionConfirmedPayload;
  DiaryEntryCorrected: DiaryEntryCorrectedPayload;
  DiaryEntryCreated: DiaryEntryCreatedPayload;
  DishBatchCreated: DishBatchCreatedPayload;
  FridgeItemAdded: FridgeItemAddedPayload;
  FridgeItemConsumed: FridgeItemConsumedPayload;
  FridgeItemWasted: FridgeItemWastedPayload;
  PrivateInventoryItemAdded: PrivateInventoryItemAddedPayload;
  PrivateInventoryItemConsumed: PrivateInventoryItemConsumedPayload;
  ServeSplitCompleted: ServeSplitCompletedPayload;
  ServeSplitCreated: ServeSplitCreatedPayload;
};

export type PayloadFor<TType extends DomainEventType> = EventPayloadMap[TType];

export type EventEnvelope = Readonly<{
  actor_id: ActorId;
  event_id: DomainEventId;
  event_type: DomainEventType;
  household_id: HouseholdId | null;
  occurred_at: string;
  operation_id: OperationId;
  payload: Record<string, unknown>;
  version: number;
}>;

export type DomainEvent<TPayload> = Omit<EventEnvelope, 'payload'> & Readonly<{
  payload: TPayload;
}>;

export const EventEnvelopeSchema = z
  .object({
    actor_id: ActorIdSchema,
    event_id: DomainEventIdSchema,
    event_type: z.enum(DOMAIN_EVENT_TYPES),
    household_id: HouseholdIdSchema.nullable(),
    occurred_at: z.string().datetime(),
    operation_id: OperationIdSchema,
    payload: z.record(z.string(), z.unknown()),
    version: z.number().int().positive().default(1),
  })
  .strict();
