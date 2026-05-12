import { assertEquals } from 'jsr:@std/assert@1.0.19';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

import type { HouseholdContext } from '../_shared/middleware/householdGuard.ts';
import type { PayloadFor } from '../_shared/types/events.ts';
import {
  executeConsumeFridgeItem,
  executeCreateFridgeItem,
  executeListFridgeItems,
  executeUpdateFridgeItem,
  executeWasteFridgeItem,
  type FridgeItemRow,
  type FridgeService,
  handler,
} from './index.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const householdId = '22222222-2222-4222-8222-222222222222';
const globalFoodId = '33333333-3333-4333-8333-333333333333';
const householdFoodId = '44444444-4444-4444-8444-444444444444';
const variationId = '55555555-5555-4555-8555-555555555555';
const fridgeItemId = '66666666-6666-4666-8666-666666666666';
const operationId = '77777777-7777-4777-8777-777777777777';

type SourceSnapshot = Readonly<{
  category: string | null;
  carbs_mg_per_100_unit: number;
  density_mg_per_ml: number | null;
  fat_mg_per_100_unit: number;
  id: string;
  kcal_per_100_unit: number;
  name: string;
  nutrition_basis: 'per_100g' | 'per_100ml';
  protein_mg_per_100_unit: number;
}>;

type FridgeEvent = Readonly<{
  payload:
    | PayloadFor<'FridgeItemAdded'>
    | PayloadFor<'FridgeItemConsumed'>
    | PayloadFor<'FridgeItemWasted'>;
  type: 'FridgeItemAdded' | 'FridgeItemConsumed' | 'FridgeItemWasted';
}>;

class FakeFridgeService implements FridgeService {
  public createdItems: Record<string, unknown>[] = [];
  public events: FridgeEvent[] = [];
  public globalSnapshot: SourceSnapshot | null = makeSnapshot({
    id: globalFoodId,
    name: 'Greek Yogurt',
  });
  public householdSnapshot: SourceSnapshot | null = makeSnapshot({
    id: householdFoodId,
    name: 'House Soup',
  });
  public items: FridgeItemRow[] = [];
  public updates: Record<string, unknown>[] = [];
  public variationSnapshot: SourceSnapshot | null = makeSnapshot({
    id: variationId,
    name: 'Confirmed Yogurt Variation',
  });

  public async createFridgeItem(
    values: Record<string, unknown>,
  ): Promise<{ data: FridgeItemRow | null; error: unknown | null }> {
    this.createdItems.push(values);
    const row = makeFridgeItem({
      base_unit: values.base_unit as 'count_each' | 'mass_mg' | 'volume_ml',
      estimated_expiry: values.estimated_expiry as string | null,
      food_variation_id: values.food_variation_id as string | null,
      global_food_id: values.global_food_id as string | null,
      household_food_item_id: values.household_food_item_id as string | null,
      household_id: values.household_id as string,
      quantity_base: values.quantity_base as number,
      snapshot_carbs_mg_per_100_unit: values.snapshot_carbs_mg_per_100_unit as number,
      snapshot_category: values.snapshot_category as string | null,
      snapshot_density_mg_per_ml: values.snapshot_density_mg_per_ml as number | null,
      snapshot_fat_mg_per_100_unit: values.snapshot_fat_mg_per_100_unit as number,
      snapshot_food_name: values.snapshot_food_name as string,
      snapshot_kcal_per_100_unit: values.snapshot_kcal_per_100_unit as number,
      snapshot_nutrition_basis: values.snapshot_nutrition_basis as 'per_100g' | 'per_100ml',
      snapshot_protein_mg_per_100_unit: values.snapshot_protein_mg_per_100_unit as number,
      unit_display: values.unit_display as string,
    });
    this.items.push(row);

    return { data: row, error: null };
  }

  public async emitFridgeEvent<
    TType extends 'FridgeItemAdded' | 'FridgeItemConsumed' | 'FridgeItemWasted',
  >(type: TType, payload: PayloadFor<TType>): Promise<string> {
    this.events.push({ payload, type });

    return 'event-1';
  }

  public async getFridgeItem(
    household: string,
    itemId: string,
  ): Promise<{ data: FridgeItemRow | null; error: unknown | null }> {
    return {
      data: this.items.find(
        (item) =>
          item.household_id === household && item.id === itemId && item.archived_at === null,
      ) ?? null,
      error: null,
    };
  }

  public async getGlobalFoodSnapshot(): Promise<{
    data: SourceSnapshot | null;
    error: unknown | null;
  }> {
    return { data: this.globalSnapshot, error: null };
  }

  public async getHouseholdFoodSnapshot(): Promise<{
    data: SourceSnapshot | null;
    error: unknown | null;
  }> {
    return { data: this.householdSnapshot, error: null };
  }

  public async getVariationSnapshot(): Promise<{
    data: SourceSnapshot | null;
    error: unknown | null;
  }> {
    return { data: this.variationSnapshot, error: null };
  }

  public async listFridgeItems(): Promise<{
    data: FridgeItemRow[] | null;
    error: unknown | null;
  }> {
    return { data: this.items.filter((item) => item.archived_at === null), error: null };
  }

  public async updateFridgeItem(
    household: string,
    itemId: string,
    values: Record<string, unknown>,
  ): Promise<{ data: FridgeItemRow | null; error: unknown | null }> {
    this.updates.push({ household_id: household, id: itemId, ...values });
    const current = this.items.find((item) => item.id === itemId);

    if (!current) {
      return { data: null, error: null };
    }

    const updated = {
      ...current,
      ...values,
      updated_at: '2026-04-25T10:00:00.000Z',
    } as FridgeItemRow;
    this.items = this.items.map((item) => (item.id === itemId ? updated : item));

    return { data: updated, error: null };
  }
}

const makeContext = (overrides: Partial<HouseholdContext> = {}): HouseholdContext => ({
  household_id: householdId,
  jwt: 'jwt',
  operation_id: operationId,
  role: 'member',
  supabase: {} as SupabaseClient,
  user_id: userId,
  ...overrides,
});

const makeSnapshot = (overrides: Partial<SourceSnapshot> = {}): SourceSnapshot => ({
  carbs_mg_per_100_unit: 400000,
  category: 'dairy',
  density_mg_per_ml: null,
  fat_mg_per_100_unit: 300000,
  id: globalFoodId,
  kcal_per_100_unit: 12000,
  name: 'Greek Yogurt',
  nutrition_basis: 'per_100g',
  protein_mg_per_100_unit: 1000000,
  ...overrides,
});

const makeFridgeItem = (overrides: Partial<FridgeItemRow> = {}): FridgeItemRow => ({
  added_by: userId,
  archived_at: null,
  base_unit: 'mass_mg',
  created_at: '2026-04-25T09:00:00.000Z',
  estimated_expiry: '2026-04-30',
  food_variation_id: null,
  global_food_id: globalFoodId,
  household_food_item_id: null,
  household_id: householdId,
  id: fridgeItemId,
  personal_food_id: null,
  quantity_base: 1000,
  snapshot_carbs_mg_per_100_unit: 400000,
  snapshot_category: 'dairy',
  snapshot_density_mg_per_ml: null,
  snapshot_fat_mg_per_100_unit: 300000,
  snapshot_food_name: 'Greek Yogurt',
  snapshot_kcal_per_100_unit: 12000,
  snapshot_nutrition_basis: 'per_100g',
  snapshot_protein_mg_per_100_unit: 1000000,
  unit_display: '1 g',
  updated_at: '2026-04-25T09:00:00.000Z',
  version: 1,
  ...overrides,
});

const readJson = async (response: Response): Promise<unknown> => await response.json();

Deno.test('fridge endpoints require auth', async () => {
  const response = await handler(
    new Request(
      `https://example.supabase.co/functions/v1/fridge-items/households/${householdId}/fridge`,
    ),
  );

  assertEquals(response.status, 401);
});

Deno.test('list fridge items returns active household rows', async () => {
  const service = new FakeFridgeService();
  service.items = [
    makeFridgeItem(),
    makeFridgeItem({
      archived_at: '2026-04-25T10:00:00.000Z',
      id: '88888888-8888-4888-8888-888888888888',
    }),
  ];

  const response = await executeListFridgeItems(service, makeContext());
  const body = (await readJson(response)) as { data: { items: ReadonlyArray<{ id: string }> } };

  assertEquals(response.status, 200);
  assertEquals(
    body.data.items.map((item) => item.id),
    [fridgeItemId],
  );
});

Deno.test(
  'create fridge item writes a global snapshot and never writes personal_food_id',
  async () => {
    const service = new FakeFridgeService();
    const response = await executeCreateFridgeItem(service, makeContext(), {
      base_unit: 'mass_mg',
      estimated_expiry: '2026-04-30',
      quantity_base: 1000,
      source_id: globalFoodId,
      source_type: 'global',
      unit_display: '1 g',
    });

    assertEquals(response.status, 201);
    assertEquals(service.createdItems[0]?.personal_food_id, null);
    assertEquals(service.createdItems[0]?.global_food_id, globalFoodId);
    assertEquals(service.createdItems[0]?.snapshot_food_name, 'Greek Yogurt');
    assertEquals(service.events, [
      {
        payload: {
          base_unit: 'mass_mg',
          fridge_item_id: fridgeItemId,
          quantity_base: 1000,
          snapshot_food_name: 'Greek Yogurt',
          source_type: 'manual_add',
        },
        type: 'FridgeItemAdded',
      },
    ]);
  },
);

Deno.test('create fridge item supports household food sources', async () => {
  const service = new FakeFridgeService();
  const response = await executeCreateFridgeItem(service, makeContext(), {
    base_unit: 'volume_ml',
    quantity_base: 250,
    source_id: householdFoodId,
    source_type: 'household',
    unit_display: '250 ml',
  });

  assertEquals(response.status, 201);
  assertEquals(service.createdItems[0]?.household_food_item_id, householdFoodId);
  assertEquals(service.createdItems[0]?.global_food_id, null);
  assertEquals(service.createdItems[0]?.personal_food_id, null);
});

Deno.test('create fridge item returns 404 when source is unavailable', async () => {
  const service = new FakeFridgeService();
  service.globalSnapshot = null;
  const response = await executeCreateFridgeItem(service, makeContext(), {
    base_unit: 'mass_mg',
    quantity_base: 1000,
    source_id: globalFoodId,
    source_type: 'global',
    unit_display: '1 g',
  });

  assertEquals(response.status, 404);
  assertEquals(service.createdItems.length, 0);
  assertEquals(service.events.length, 0);
});

Deno.test('fridge mutations require an operation id before writing', async () => {
  const service = new FakeFridgeService();
  const response = await executeCreateFridgeItem(
    service,
    makeContext({ operation_id: undefined }),
    {
      base_unit: 'mass_mg',
      quantity_base: 1000,
      source_id: globalFoodId,
      source_type: 'global',
      unit_display: '1 g',
    },
  );

  assertEquals(response.status, 400);
  assertEquals(service.createdItems.length, 0);
});

Deno.test(
  'update fridge item changes mutable fields without changing snapshot fields',
  async () => {
    const service = new FakeFridgeService();
    service.items = [makeFridgeItem()];
    const response = await executeUpdateFridgeItem(service, makeContext(), fridgeItemId, {
      estimated_expiry: '2026-05-01',
      quantity_base: 900,
      unit_display: '900 mg',
    });

    assertEquals(response.status, 200);
    assertEquals(service.updates[0], {
      estimated_expiry: '2026-05-01',
      household_id: householdId,
      id: fridgeItemId,
      quantity_base: 900,
      unit_display: '900 mg',
      version: 2,
    });
    assertEquals(service.items[0]?.snapshot_food_name, 'Greek Yogurt');
  },
);

Deno.test('update fridge item rejects members who did not add the row', async () => {
  const service = new FakeFridgeService();
  service.items = [
    makeFridgeItem({
      added_by: '88888888-8888-4888-8888-888888888888',
    }),
  ];
  const response = await executeUpdateFridgeItem(service, makeContext(), fridgeItemId, {
    quantity_base: 900,
  });

  assertEquals(response.status, 403);
  assertEquals(service.updates.length, 0);
});

Deno.test('consume fridge item partially decrements quantity and emits event', async () => {
  const service = new FakeFridgeService();
  service.items = [makeFridgeItem({ quantity_base: 1000 })];
  const response = await executeConsumeFridgeItem(service, makeContext(), fridgeItemId, {
    base_unit: 'mass_mg',
    create_diary_entry: true,
    quantity_base: 400,
  });

  assertEquals(response.status, 200);
  assertEquals(service.updates[0]?.quantity_base, 600);
  assertEquals(service.events, [
    {
      payload: {
        base_unit: 'mass_mg',
        fridge_item_id: fridgeItemId,
        quantity_consumed: 400,
        remaining_quantity: 600,
      },
      type: 'FridgeItemConsumed',
    },
  ]);
});

Deno.test('consume fridge item rejects quantities above availability', async () => {
  const service = new FakeFridgeService();
  service.items = [makeFridgeItem({ quantity_base: 1000 })];
  const response = await executeConsumeFridgeItem(service, makeContext(), fridgeItemId, {
    base_unit: 'mass_mg',
    quantity_base: 1001,
  });

  assertEquals(response.status, 409);
  assertEquals(service.updates.length, 0);
  assertEquals(service.events.length, 0);
});

Deno.test('consume fridge item archives the row when quantity reaches zero', async () => {
  const service = new FakeFridgeService();
  service.items = [makeFridgeItem({ quantity_base: 1000 })];
  const response = await executeConsumeFridgeItem(service, makeContext(), fridgeItemId, {
    base_unit: 'mass_mg',
    quantity_base: 1000,
  });

  assertEquals(response.status, 200);
  assertEquals(typeof service.updates[0]?.archived_at, 'string');
  assertEquals(service.updates[0]?.quantity_base, undefined);
  assertEquals(service.events[0]?.payload, {
    base_unit: 'mass_mg',
    fridge_item_id: fridgeItemId,
    quantity_consumed: 1000,
    remaining_quantity: 0,
  });
});

Deno.test('waste fridge item archives the row and emits the waste reason', async () => {
  const service = new FakeFridgeService();
  service.items = [makeFridgeItem({ quantity_base: 1000 })];
  const response = await executeWasteFridgeItem(service, makeContext(), fridgeItemId, {
    base_unit: 'mass_mg',
    quantity_base: 1000,
    reason: 'expired',
  });

  assertEquals(response.status, 200);
  assertEquals(typeof service.updates[0]?.archived_at, 'string');
  assertEquals(service.events[0]?.payload, {
    base_unit: 'mass_mg',
    fridge_item_id: fridgeItemId,
    quantity_wasted: 1000,
    reason: 'expired',
    remaining_quantity: 0,
  });
});
