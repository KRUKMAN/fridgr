import { getServiceClient } from '../db/client.ts';
import type { RequestContext } from '../types/context.ts';
import type { DomainEventType, PayloadFor } from '../types/events.ts';
import { eventSchemas } from '../types/schemas/events.ts';

type EventInsertResult = Readonly<{
  id: string;
}>;

type EventWriter = Readonly<{
  from: (table: 'domain_events') => {
    insert: (payload: Readonly<Record<string, unknown>>) => {
      select: (columns: 'id') => {
        single: () => Promise<{
          data: EventInsertResult | null;
          error: Error | null;
        }>;
      };
    };
  };
}>;

export type EventContext = RequestContext &
  Readonly<{
    operation_id: string;
  }>;

const getWriter = (writer?: EventWriter): EventWriter =>
  writer ?? (getServiceClient() as unknown as EventWriter);

export const emitEvent = async <TType extends DomainEventType>(
  type: TType,
  payload: PayloadFor<TType>,
  context: EventContext,
  tx?: EventWriter,
): Promise<string> => {
  const parsedPayload = eventSchemas[type].safeParse(payload);

  if (!parsedPayload.success) {
    throw new Error(`Invalid payload for event type ${type}`);
  }

  const { data, error } = await getWriter(tx)
    .from('domain_events')
    .insert({
      actor_id: context.user_id,
      type,
      household_id: context.household_id ?? null,
      payload: parsedPayload.data,
      version: 1,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? `Failed to insert ${type} event`);
  }

  return data.id;
};
