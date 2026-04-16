import { z } from 'zod';

const UUID_SCHEMA = z.string().uuid();
const ISO_TIMESTAMP_SCHEMA = z.string().datetime({ offset: true });

export const DomainEventIdSchema = UUID_SCHEMA.brand<'DomainEventId'>();
export const OperationIdSchema = UUID_SCHEMA.brand<'OperationId'>();
export const ActorIdSchema = UUID_SCHEMA.brand<'ActorId'>();
export const HouseholdIdSchema = UUID_SCHEMA.brand<'HouseholdId'>();

export type DomainEventId = z.infer<typeof DomainEventIdSchema>;
export type OperationId = z.infer<typeof OperationIdSchema>;
export type ActorId = z.infer<typeof ActorIdSchema>;
export type HouseholdId = z.infer<typeof HouseholdIdSchema>;

export const EventEnvelopeSchema = z
  .object({
    event_id: DomainEventIdSchema,
    event_type: z.string().min(1),
    payload: z.unknown(),
    actor_id: ActorIdSchema,
    household_id: HouseholdIdSchema.nullable(),
    operation_id: OperationIdSchema,
    occurred_at: ISO_TIMESTAMP_SCHEMA,
    version: z.number().int().positive().default(1),
  })
  .strict();

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export interface DomainEvent<TPayload, TEventType extends string = string>
  extends Omit<EventEnvelope, 'event_type' | 'payload'> {
  event_type: TEventType;
  payload: TPayload;
}

export const EventNotificationSchema = z
  .object({
    event_id: DomainEventIdSchema,
    event_type: z.string().min(1),
  })
  .strict();

export type EventNotification = z.infer<typeof EventNotificationSchema>;

export const EventWriteContextSchema = z
  .object({
    actor_id: ActorIdSchema,
    household_id: HouseholdIdSchema.nullable(),
    operation_id: OperationIdSchema,
  })
  .strict();

export type EventWriteContext = z.infer<typeof EventWriteContextSchema>;

export const parseDomainEventId = (value: string): DomainEventId =>
  DomainEventIdSchema.parse(value);

export const parseOperationId = (value: string): OperationId =>
  OperationIdSchema.parse(value);

export const parseActorId = (value: string): ActorId =>
  ActorIdSchema.parse(value);

export const parseHouseholdId = (value: string): HouseholdId =>
  HouseholdIdSchema.parse(value);

