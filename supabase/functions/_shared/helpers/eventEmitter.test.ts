import { assertEquals, assertRejects } from 'jsr:@std/assert@1.0.19';

import { emitEvent } from './eventEmitter.ts';

type InsertRow = Readonly<Record<string, unknown>>;

const createWriter = (eventId = 'event-123') => {
  const inserts: InsertRow[] = [];

  return {
    inserts,
    writer: {
      from: (table: 'domain_events') => ({
        insert: (payload: InsertRow) => {
          assertEquals(table, 'domain_events');
          inserts.push(payload);

          return {
            select: (columns: 'id') => {
              assertEquals(columns, 'id');

              return {
                single: async () => ({
                  data: { id: eventId },
                  error: null,
                }),
              };
            },
          };
        },
      }),
    },
  };
};

Deno.test('emitEvent validates payloads and inserts a normalized domain event row', async () => {
  const { inserts, writer } = createWriter();

  const eventId = await emitEvent(
    'AiSubmissionConfirmed',
    {
      capture_type: 'receipt',
      confirmation_latency_ms: 2200,
      item_count: 3,
      unresolved_count: 1,
    },
    {
      household_id: '550e8400-e29b-41d4-a716-446655440000',
      operation_id: '550e8400-e29b-41d4-a716-446655440001',
      supabase: {} as never,
      user_id: '550e8400-e29b-41d4-a716-446655440002',
    },
    writer,
  );

  assertEquals(eventId, 'event-123');
  assertEquals(inserts, [
    {
      actor_id: '550e8400-e29b-41d4-a716-446655440002',
      household_id: '550e8400-e29b-41d4-a716-446655440000',
      payload: {
        capture_type: 'receipt',
        confirmation_latency_ms: 2200,
        item_count: 3,
        unresolved_count: 1,
      },
      type: 'AiSubmissionConfirmed',
      version: 1,
    },
  ]);
});

Deno.test('emitEvent rejects invalid payloads before touching the database', async () => {
  const { inserts, writer } = createWriter();

  await assertRejects(
    () =>
      emitEvent(
        'AiSubmissionConfirmed',
        {
          capture_type: 'not-a-real-type',
          confirmation_latency_ms: 2200,
          item_count: 3,
          unresolved_count: 1,
        } as never,
        {
          operation_id: '550e8400-e29b-41d4-a716-446655440001',
          supabase: {} as never,
          user_id: '550e8400-e29b-41d4-a716-446655440002',
        },
        writer,
      ),
    Error,
    'Invalid payload for event type AiSubmissionConfirmed',
  );

  assertEquals(inserts.length, 0);
});
