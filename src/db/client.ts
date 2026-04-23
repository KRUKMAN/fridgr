import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from '@db/migrations/migrations';
import { households } from '@db/schema';

import * as schema from './schema';

const expoDatabase = openDatabaseSync('fridgr.db');

export const db = drizzle(expoDatabase, { schema });

let migrationPromise: Promise<void> | null = null;

export const ensureDatabaseReady = async (): Promise<void> => {
  if (migrationPromise === null) {
    migrationPromise = migrate(db, migrations);
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
