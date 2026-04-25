import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from '@db/migrations/migrations';
import { households } from '@db/schema';

import * as schema from './schema';
import {
  getLocalDatabaseUnsupportedMessage,
  isLocalDatabaseSupported,
  LOCAL_DATABASE_NAME,
} from './support';

import type { SQLiteDatabase } from 'expo-sqlite';

let expoDatabase: SQLiteDatabase | null = null;
let migrationPromise: Promise<void> | null = null;

const getExpoDatabase = (): SQLiteDatabase => {
  if (!isLocalDatabaseSupported()) {
    throw new Error(getLocalDatabaseUnsupportedMessage());
  }

  if (expoDatabase === null) {
    expoDatabase = openDatabaseSync(LOCAL_DATABASE_NAME);
  }

  return expoDatabase;
};

const getDb = () => drizzle(getExpoDatabase(), { schema });

export const ensureDatabaseReady = async (): Promise<void> => {
  if (!isLocalDatabaseSupported()) {
    return;
  }

  if (migrationPromise === null) {
    migrationPromise = migrate(getDb(), migrations);
  }

  await migrationPromise;
};

export interface LocalRoundtripResult {
  householdCount: number;
  householdId: string;
  householdName: string;
}

export const runLocalRoundtrip = async (): Promise<LocalRoundtripResult> => {
  await ensureDatabaseReady();

  if (!isLocalDatabaseSupported()) {
    throw new Error(getLocalDatabaseUnsupportedMessage());
  }

  const db = getDb();
  const timestamp = new Date().toISOString();
  const householdId = `local-household-${timestamp}`;
  const householdName = `Debug household ${timestamp}`;

  await db.insert(households).values({
    id: householdId,
    name: householdName,
    owner_id: 'local-debug-user',
    invite_code: null,
    created_at: timestamp,
    archived_at: null,
    synced_at: null,
    _pending_mutation: true,
  });

  const latestHousehold = await db.query.households.findFirst({
    orderBy: [desc(households.created_at)],
    where: eq(households.id, householdId),
  });

  const householdCountRows = await db.select().from(households);

  return {
    householdCount: householdCountRows.length,
    householdId,
    householdName: latestHousehold?.name ?? householdName,
  };
};
