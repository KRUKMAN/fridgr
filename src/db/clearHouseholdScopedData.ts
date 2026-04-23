import { openDatabaseSync } from 'expo-sqlite';

const LOCAL_DATABASE_NAME = 'fridgr.db';

const escapeSqlString = (value: string): string => value.replaceAll("'", "''");

export const clearHouseholdScopedData = async (householdId: string): Promise<void> => {
  const trimmedHouseholdId = householdId.trim();

  if (!trimmedHouseholdId) {
    return;
  }

  const database = openDatabaseSync(LOCAL_DATABASE_NAME);
  const literalHouseholdId = `'${escapeSqlString(trimmedHouseholdId)}'`;

  const statements = [
    'PRAGMA foreign_keys = OFF;',
    'BEGIN TRANSACTION;',
    `DELETE FROM ai_capture_items WHERE session_id IN (
      SELECT id FROM ai_capture_sessions WHERE household_id = ${literalHouseholdId}
    );`,
    `DELETE FROM dish_batch_ingredients WHERE dish_batch_id IN (
      SELECT id FROM dish_batches WHERE household_id = ${literalHouseholdId}
    );`,
    `DELETE FROM serve_split_portions WHERE event_id IN (
      SELECT id FROM serve_split_events WHERE household_id = ${literalHouseholdId}
    );`,
    `DELETE FROM recipe_template_ingredients WHERE recipe_template_id IN (
      SELECT id FROM recipe_templates WHERE owner_household_id = ${literalHouseholdId}
    );`,
    `DELETE FROM ai_capture_sessions WHERE household_id = ${literalHouseholdId};`,
    `DELETE FROM dish_batches WHERE household_id = ${literalHouseholdId};`,
    `DELETE FROM food_variations WHERE household_id = ${literalHouseholdId};`,
    `DELETE FROM fridge_items WHERE household_id = ${literalHouseholdId};`,
    `DELETE FROM household_food_items WHERE household_id = ${literalHouseholdId};`,
    `DELETE FROM household_members WHERE household_id = ${literalHouseholdId};`,
    `DELETE FROM households WHERE id = ${literalHouseholdId};`,
    `DELETE FROM private_inventory_items WHERE household_id = ${literalHouseholdId};`,
    `DELETE FROM recipe_templates WHERE owner_household_id = ${literalHouseholdId};`,
    `DELETE FROM serve_split_events WHERE household_id = ${literalHouseholdId};`,
    'COMMIT;',
    'PRAGMA foreign_keys = ON;',
  ];

  try {
    for (const statement of statements) {
      await database.execAsync(statement);
    }
  } catch (error) {
    await database.execAsync('ROLLBACK;').catch(() => undefined);
    await database.execAsync('PRAGMA foreign_keys = ON;').catch(() => undefined);
    throw error;
  } finally {
    await database.closeAsync().catch(() => undefined);
  }
};
