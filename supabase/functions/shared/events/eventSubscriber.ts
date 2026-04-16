import {
  EventSchemaMap,
  type EventPayloadMap,
  type EventType,
} from '../types/eventRegistry';
import { EventEnvelopeSchema, EventNotificationSchema, type DomainEvent } from '../types/events';

export interface EventSubscriberLogger {
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
}

const consoleLogger: EventSubscriberLogger = {
  error: (message: string, context?: Record<string, unknown>): void => {
    console.error(message, context);
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    console.warn(message, context);
  },
};

export interface EventSubscriberStore {
  getDomainEventById(eventId: string): Promise<unknown | null>;
}

export type EventHandler<TEventType extends EventType> = (
  event: DomainEvent<EventPayloadMap[TEventType], TEventType>,
) => Promise<void> | void;

export class EventSubscriber {
  private readonly handlers = new Map<EventType, Set<EventHandler<EventType>>>();

  public constructor(
    private readonly store: EventSubscriberStore,
    private readonly logger: EventSubscriberLogger = consoleLogger,
  ) {}

  public on<TEventType extends EventType>(
    eventType: TEventType,
    handler: EventHandler<TEventType>,
  ): () => void {
    const existingHandlers = this.handlers.get(eventType) ?? new Set<EventHandler<EventType>>();
    existingHandlers.add(handler as EventHandler<EventType>);
    this.handlers.set(eventType, existingHandlers);

    return (): void => {
      existingHandlers.delete(handler as EventHandler<EventType>);
      if (existingHandlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  public async handleNotification(notification: unknown): Promise<void> {
    const parsedNotification = EventNotificationSchema.parse(notification);
    const storedEvent = await this.store.getDomainEventById(parsedNotification.event_id);

    if (!storedEvent) {
      this.logger.warn('Domain event referenced by notification was not found.', {
        event_id: parsedNotification.event_id,
        event_type: parsedNotification.event_type,
      });
      return;
    }

    await this.dispatchStoredEvent(storedEvent);
  }

  public async dispatchStoredEvent(event: unknown): Promise<void> {
    const parsedEnvelope = EventEnvelopeSchema.parse(event);
    const eventType = parsedEnvelope.event_type as EventType;
    const payloadSchema = EventSchemaMap[eventType];

    if (!payloadSchema) {
      this.logger.warn('Unsupported domain event type received by subscriber.', {
        event_id: parsedEnvelope.event_id,
        event_type: parsedEnvelope.event_type,
      });
      return;
    }

    const parsedPayload = payloadSchema.parse(parsedEnvelope.payload);
    const typedEvent = {
      ...parsedEnvelope,
      event_type: eventType,
      payload: parsedPayload,
    } as DomainEvent<EventPayloadMap[typeof eventType], typeof eventType>;
    const handlers = this.handlers.get(eventType);

    if (!handlers || handlers.size === 0) {
      return;
    }

    for (const handler of handlers) {
      try {
        await handler(typedEvent as never);
      } catch (error) {
        this.logger.error('Domain event handler failed.', {
          event_id: parsedEnvelope.event_id,
          event_type: parsedEnvelope.event_type,
          error,
        });
      }
    }
  }

  public dispose(): void {
    this.handlers.clear();
  }
}
