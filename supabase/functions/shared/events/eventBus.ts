import { z } from 'zod';

import {
  EventSchemaMap,
  type EventPayloadMap,
  type EventType,
} from '../types/eventRegistry';
import {
  EventEnvelopeSchema,
  EventWriteContextSchema,
  type DomainEvent,
  type DomainEventId,
  type EventEnvelope,
  type EventWriteContext,
} from '../types/events';

import type { Sql, TransactionSql } from 'postgres';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface EventStore {
  insertDomainEvent(event: EventEnvelope): Promise<EventEnvelope | null>;
  findDomainEventByOperation(
    operationId: EventWriteContext['operation_id'],
    eventType: EventType,
  ): Promise<EventEnvelope | null>;
}

const DOMAIN_EVENT_SELECT = `
  select
    event_id::text as event_id,
    event_type,
    payload,
    actor_id::text as actor_id,
    household_id::text as household_id,
    operation_id::text as operation_id,
    to_char(occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as occurred_at,
    version
  from public.domain_events
`;

const EmitEventInputSchema = z
  .object({
    occurred_at: z.string().datetime({ offset: true }).optional(),
    version: z.number().int().positive().optional(),
  })
  .strict();

export interface EmitEventOptions<TEventType extends EventType> {
  store: EventStore;
  eventType: TEventType;
  payload: EventPayloadMap[TEventType];
  context: EventWriteContext;
  occurred_at?: string;
  version?: number;
}

const createDomainEventId = (): DomainEventId =>
  EventEnvelopeSchema.shape.event_id.parse(crypto.randomUUID());

const validateEnvelope = <TEventType extends EventType>(
  rawEvent: EventEnvelope,
  eventType: TEventType,
): DomainEvent<EventPayloadMap[TEventType], TEventType> => {
  const envelope = EventEnvelopeSchema.parse(rawEvent);
  const payload = EventSchemaMap[eventType].parse(
    envelope.payload,
  ) as EventPayloadMap[TEventType];

  return {
    ...envelope,
    event_type: eventType,
    payload,
  };
};

export const emitEvent = async <TEventType extends EventType>(
  options: EmitEventOptions<TEventType>,
): Promise<DomainEvent<EventPayloadMap[TEventType], TEventType>> => {
  const parsedContext = EventWriteContextSchema.parse(options.context);
  const parsedInput = EmitEventInputSchema.parse({
    occurred_at: options.occurred_at,
    version: options.version,
  });
  const parsedPayload = EventSchemaMap[options.eventType].parse(options.payload);

  const eventEnvelope: EventEnvelope = EventEnvelopeSchema.parse({
    event_id: createDomainEventId(),
    event_type: options.eventType,
    payload: parsedPayload,
    actor_id: parsedContext.actor_id,
    household_id: parsedContext.household_id,
    operation_id: parsedContext.operation_id,
    occurred_at: parsedInput.occurred_at ?? new Date().toISOString(),
    version: parsedInput.version ?? 1,
  });

  const insertedEvent = await options.store.insertDomainEvent(eventEnvelope);

  if (insertedEvent) {
    return validateEnvelope(insertedEvent, options.eventType);
  }

  const existingEvent = await options.store.findDomainEventByOperation(
    parsedContext.operation_id,
    options.eventType,
  );

  if (!existingEvent) {
    throw new Error(
      `Failed to insert domain event for operation ${parsedContext.operation_id} and no existing row was found.`,
    );
  }

  return validateEnvelope(existingEvent, options.eventType);
};

export const createPostgresEventStore = (
  sql: Sql | TransactionSql,
): EventStore => ({
  insertDomainEvent: async (event: EventEnvelope): Promise<EventEnvelope | null> => {
    const rows = await sql<EventEnvelope[]>`
      insert into public.domain_events (
        event_id,
        event_type,
        payload,
        actor_id,
        household_id,
        operation_id,
        occurred_at,
        version
      )
      values (
        ${event.event_id}::uuid,
        ${event.event_type},
        ${sql.json(event.payload as JsonValue)}::jsonb,
        ${event.actor_id}::uuid,
        ${event.household_id}::uuid,
        ${event.operation_id}::uuid,
        ${event.occurred_at}::timestamptz,
        ${event.version}
      )
      on conflict (operation_id, event_type) do nothing
      returning
        event_id::text as event_id,
        event_type,
        payload,
        actor_id::text as actor_id,
        household_id::text as household_id,
        operation_id::text as operation_id,
        to_char(occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as occurred_at,
        version
    `;

    return rows[0] ?? null;
  },
  findDomainEventByOperation: async (
    operationId: EventWriteContext['operation_id'],
    eventType: EventType,
  ): Promise<EventEnvelope | null> => {
    const rows = await sql.unsafe<EventEnvelope[]>(
      `${DOMAIN_EVENT_SELECT}
       where operation_id = $1::uuid
         and event_type = $2
       limit 1`,
      [operationId, eventType],
    );

    return rows[0] ?? null;
  },
});
