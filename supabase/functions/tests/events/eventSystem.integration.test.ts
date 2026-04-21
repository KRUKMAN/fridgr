import assert from 'node:assert/strict';
import path from 'node:path';
import { after, afterEach, before, test } from 'node:test';
import postgres, { type Sql } from 'postgres';

import {
  createPostgresEventStore,
  emitEvent,
} from '../../shared/events/eventBus';
import { EventSubscriber } from '../../shared/events/eventSubscriber';
import {
  EVENT_TYPES,
  type FridgeItemAddedPayload,
} from '../../shared/types/eventRegistry';
import {
  type EventEnvelope,
  type EventNotification,
  parseActorId,
  parseHouseholdId,
  parseOperationId,
} from '../../shared/types/events';

const DEFAULT_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const DB_URL = process.env.FRIDGR_SUPABASE_DB_URL ?? DEFAULT_DB_URL;
const REQUIRE_DB_TESTS = process.env.FRIDGR_REQUIRE_DB_TESTS === '1';
const EVENT_MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../migrations/20260416121500_event_system_foundation.sql',
);

let adminSql: Sql | null = null;
let listenerSql: Sql | null = null;
let integrationReady = false;
const integrationSkipReason =
  'Local Supabase database is unavailable. Start the local stack or set FRIDGR_SUPABASE_DB_URL.';

const createSqlClient = (): Sql =>
  postgres(DB_URL, {
    max: 1,
    prepare: false,
    connect_timeout: 2,
    idle_timeout: 2,
    onnotice: (): void => undefined,
  });

const requireSql = (): Sql => {
  if (!adminSql) {
    throw new Error('Integration SQL client is not initialized.');
  }

  return adminSql;
};

const makeEventContext = (householdId: string | null): {
  actor_id: ReturnType<typeof parseActorId>;
  household_id: ReturnType<typeof parseHouseholdId> | null;
  operation_id: ReturnType<typeof parseOperationId>;
} => ({
  actor_id: parseActorId(crypto.randomUUID()),
  household_id: householdId ? parseHouseholdId(householdId) : null,
  operation_id: parseOperationId(crypto.randomUUID()),
});

const makeFridgeItemAddedPayload = (): {
  fridge_item_id: string;
  snapshot_food_name: string;
  quantity_base: number;
  base_unit: 'count_each';
  source_type: 'manual_add';
} => ({
  fridge_item_id: crypto.randomUUID(),
  snapshot_food_name: 'Test Yogurt',
  quantity_base: 1,
  base_unit: 'count_each',
  source_type: 'manual_add',
});

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const fetchEventById = async (sql: Sql, eventId: string): Promise<EventEnvelope | null> => {
  const rows = await sql<EventEnvelope[]>`
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
    where event_id = ${eventId}::uuid
    limit 1
  `;

  return rows[0] ?? null;
};

const countEvents = async (sql: Sql): Promise<number> => {
  const rows = await sql<Array<{ count: string }>>`
    select count(*)::text as count
    from public.domain_events
  `;

  return Number(rows[0]?.count ?? '0');
};

const waitForNotification = async (
  sql: Sql,
  action: () => Promise<void>,
): Promise<{ payload: EventNotification | null; unlisten: () => Promise<void> }> => {
  let resolvePayload: ((payload: string) => void) | null = null;
  const notificationPromise = new Promise<string>((resolve) => {
    resolvePayload = resolve;
  });

  const listenMeta = await sql.listen('domain_events', (payload: string) => {
    resolvePayload?.(payload);
  });

  try {
    await action();
    const rawPayload = await Promise.race<string | null>([
      notificationPromise,
      delay(500).then(() => null),
    ]);

    return {
      payload: rawPayload ? (JSON.parse(rawPayload) as EventNotification) : null,
      unlisten: async (): Promise<void> => {
        await listenMeta.unlisten();
      },
    };
  } catch (error) {
    await listenMeta.unlisten();
    throw error;
  }
};

before(async () => {
  const probeSql = createSqlClient();

  try {
    await probeSql`select 1`;
    integrationReady = true;
  } catch {
    integrationReady = false;
  } finally {
    await probeSql.end({ timeout: 1 }).catch(() => undefined);
  }

  if (!integrationReady) {
    if (REQUIRE_DB_TESTS) {
      throw new Error(
        `${integrationSkipReason} Current DB URL: ${DB_URL}.`,
      );
    }

    return;
  }

  adminSql = createSqlClient();
  listenerSql = createSqlClient();

  await requireSql().file(EVENT_MIGRATION_PATH);
});

afterEach(async () => {
  if (!integrationReady || !adminSql) {
    return;
  }

  await adminSql`delete from public.domain_events`;
});

after(async () => {
  await listenerSql?.end({ timeout: 1 }).catch(() => undefined);
  await adminSql?.end({ timeout: 1 }).catch(() => undefined);
});

test('happy path inserts row, emits notification, and dispatches to subscriber', async (t) => {
  if (!integrationReady || !listenerSql) {
    t.skip(integrationSkipReason);
    return;
  }

  const sql = requireSql();
  const store = createPostgresEventStore(sql);
  const handledEvents: EventEnvelope[] = [];
  const subscriber = new EventSubscriber({
    getDomainEventById: async (eventId: string): Promise<EventEnvelope | null> =>
      fetchEventById(sql, eventId),
  });

  subscriber.on(EVENT_TYPES.FRIDGE_ITEM_ADDED, async (event) => {
    handledEvents.push(event);
  });

  const result = await waitForNotification(listenerSql, async () => {
    await emitEvent({
      store,
      eventType: EVENT_TYPES.FRIDGE_ITEM_ADDED,
      payload: makeFridgeItemAddedPayload(),
      context: makeEventContext(crypto.randomUUID()),
    });
  });

  assert.ok(result.payload);

  const storedEvent = await fetchEventById(sql, result.payload.event_id);
  assert.ok(storedEvent);
  assert.equal(storedEvent.event_type, EVENT_TYPES.FRIDGE_ITEM_ADDED);

  await subscriber.handleNotification(result.payload);

  assert.equal(handledEvents.length, 1);
  assert.equal(handledEvents[0]?.event_id, result.payload.event_id);

  await result.unlisten();
});

test('idempotency returns the original row and does not create duplicates', async (t) => {
  if (!integrationReady) {
    t.skip(integrationSkipReason);
    return;
  }

  const sql = requireSql();
  const store = createPostgresEventStore(sql);
  const householdId = crypto.randomUUID();
  const context = makeEventContext(householdId);
  const payload = makeFridgeItemAddedPayload();

  const firstEvent = await emitEvent({
    store,
    eventType: EVENT_TYPES.FRIDGE_ITEM_ADDED,
    payload,
    context,
  });
  const secondEvent = await emitEvent({
    store,
    eventType: EVENT_TYPES.FRIDGE_ITEM_ADDED,
    payload,
    context,
  });

  assert.equal(firstEvent.event_id, secondEvent.event_id);
  assert.equal(await countEvents(sql), 1);
});

test('payload validation rejects invalid payloads before insert', async (t) => {
  if (!integrationReady) {
    t.skip(integrationSkipReason);
    return;
  }

  const sql = requireSql();
  const store = createPostgresEventStore(sql);

  await assert.rejects(
    emitEvent({
      store,
      eventType: EVENT_TYPES.FRIDGE_ITEM_ADDED,
      payload: {
        fridge_item_id: crypto.randomUUID(),
      } as unknown as FridgeItemAddedPayload,
      context: makeEventContext(crypto.randomUUID()),
    }),
  );

  assert.equal(await countEvents(sql), 0);
});

test('personal-scope events allow a nullable household_id', async (t) => {
  if (!integrationReady) {
    t.skip(integrationSkipReason);
    return;
  }

  const sql = requireSql();
  const store = createPostgresEventStore(sql);
  const event = await emitEvent({
    store,
    eventType: EVENT_TYPES.PRIVATE_INVENTORY_ITEM_ADDED,
    payload: {
      item_id: crypto.randomUUID(),
      snapshot_food_name: 'Protein Bar',
      quantity_base: 2,
      base_unit: 'count_each',
      source_type: 'manual_add',
    },
    context: makeEventContext(null),
  });

  assert.equal(event.household_id, null);

  const storedEvent = await fetchEventById(sql, event.event_id);
  assert.equal(storedEvent?.household_id ?? null, null);
});

test('subscriber logs handler errors and continues processing later events', async (t) => {
  if (!integrationReady || !listenerSql) {
    t.skip(integrationSkipReason);
    return;
  }

  const sql = requireSql();
  const store = createPostgresEventStore(sql);
  const loggedErrors: Array<Record<string, unknown> | undefined> = [];
  let successfulHandlerCalls = 0;
  const subscriber = new EventSubscriber(
    {
      getDomainEventById: async (eventId: string): Promise<EventEnvelope | null> =>
        fetchEventById(sql, eventId),
    },
    {
      error: (_message: string, context?: Record<string, unknown>): void => {
        loggedErrors.push(context);
      },
      warn: (): void => undefined,
    },
  );

  subscriber.on(EVENT_TYPES.FRIDGE_ITEM_ADDED, async () => {
    throw new Error('handler failed');
  });
  subscriber.on(EVENT_TYPES.FRIDGE_ITEM_ADDED, async () => {
    successfulHandlerCalls += 1;
  });

  const firstNotification = await waitForNotification(listenerSql, async () => {
    await emitEvent({
      store,
      eventType: EVENT_TYPES.FRIDGE_ITEM_ADDED,
      payload: makeFridgeItemAddedPayload(),
      context: makeEventContext(crypto.randomUUID()),
    });
  });
  const secondNotification = await waitForNotification(listenerSql, async () => {
    await emitEvent({
      store,
      eventType: EVENT_TYPES.FRIDGE_ITEM_ADDED,
      payload: makeFridgeItemAddedPayload(),
      context: makeEventContext(crypto.randomUUID()),
    });
  });

  assert.ok(firstNotification.payload);
  assert.ok(secondNotification.payload);

  await subscriber.handleNotification(firstNotification.payload);
  await subscriber.handleNotification(secondNotification.payload);

  assert.equal(successfulHandlerCalls, 2);
  assert.equal(loggedErrors.length, 2);

  await firstNotification.unlisten();
  await secondNotification.unlisten();
});

test('transaction rollback leaves no row behind and sends no notification', async (t) => {
  if (!integrationReady || !listenerSql) {
    t.skip(integrationSkipReason);
    return;
  }

  const sql = requireSql();
  const rollbackMarker = new Error('rollback');
  const notification = await waitForNotification(listenerSql, async () => {
    await assert.rejects(
      sql.begin(async (transactionSql) => {
        const store = createPostgresEventStore(transactionSql);
        await emitEvent({
          store,
          eventType: EVENT_TYPES.FRIDGE_ITEM_ADDED,
          payload: makeFridgeItemAddedPayload(),
          context: makeEventContext(crypto.randomUUID()),
        });
        throw rollbackMarker;
      }),
      (error: unknown) => error === rollbackMarker,
    );
  });

  assert.equal(notification.payload, null);
  assert.equal(await countEvents(sql), 0);

  await notification.unlisten();
});
