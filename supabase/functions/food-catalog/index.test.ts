import { assertEquals } from 'jsr:@std/assert@1.0.19';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

import type { AuthContext } from '../_shared/middleware/auth.ts';
import {
  type CatalogService,
  executeCreateFoodVariation,
  executeCreatePersonalFood,
  executePromoteFoodVariation,
  executeSearchFoods,
  executeUpdateFoodVariation,
  type FoodVariationRow,
  handleAuthenticatedRequest,
  handler,
  type StoredFoodRow,
} from './index.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const householdId = '22222222-2222-4222-8222-222222222222';
const globalId = '33333333-3333-4333-8333-333333333333';
const personalId = '44444444-4444-4444-8444-444444444444';
const householdFoodId = '55555555-5555-4555-8555-555555555555';
const variationId = '66666666-6666-4666-8666-666666666666';
const submissionId = '77777777-7777-4777-8777-777777777777';

type MembershipRow = Readonly<{
  role: 'member' | 'owner';
}> | null;

type MembershipQueryState = {
  readonly filters: Map<string, string>;
  readonly row: MembershipRow;
};

class MockMembershipQuery {
  public constructor(private readonly state: MembershipQueryState) {}

  public eq(column: string, value: string): MockMembershipQuery {
    this.state.filters.set(column, value);
    return this;
  }

  public async maybeSingle<T>(): Promise<{ data: T | null; error: Error | null }> {
    return {
      data: this.state.row as T | null,
      error: null,
    };
  }
}

class MockSupabaseClient {
  public readonly queryStates: MembershipQueryState[] = [];

  public constructor(public nextRow: MembershipRow = { role: 'member' }) {}

  public from(table: string): { select: (columns: string) => MockMembershipQuery } {
    assertEquals(table, 'household_members');

    return {
      select: () => {
        const state: MembershipQueryState = {
          filters: new Map<string, string>(),
          row: this.nextRow,
        };

        this.queryStates.push(state);

        return new MockMembershipQuery(state);
      },
    };
  }
}

class FakeCatalogService implements CatalogService {
  public readonly submissions: Record<string, unknown>[] = [];
  public readonly createdPersonalFoods: Record<string, unknown>[] = [];
  public readonly createdVariations: Record<string, unknown>[] = [];
  public readonly updates: Record<string, unknown>[] = [];
  public eventWrites = 0;
  public globalFoods: StoredFoodRow[] = [];
  public householdFoods: StoredFoodRow[] = [];
  public personalFoods: StoredFoodRow[] = [];
  public variations: FoodVariationRow[] = [];

  public async createGlobalSubmission(
    values: Readonly<{
      proposed_name: string;
      proposed_payload: Record<string, unknown>;
      submitted_by: string;
    }>,
  ): Promise<{ data: { id: string } | null; error: unknown | null }> {
    this.submissions.push(values);

    return {
      data: { id: submissionId },
      error: null,
    };
  }

  public async createPersonalFood(
    values: Record<string, unknown>,
  ): Promise<{ data: StoredFoodRow | null; error: unknown | null }> {
    this.createdPersonalFoods.push(values);

    return {
      data: {
        carbs_mg_per_100_unit: values.carbs_mg_per_100_unit as number,
        category: values.category as string | null,
        fat_mg_per_100_unit: values.fat_mg_per_100_unit as number,
        id: personalId,
        kcal_per_100_unit: values.kcal_per_100_unit as number,
        name: values.name as string,
        nutrition_basis: values.nutrition_basis as 'per_100g' | 'per_100ml',
        protein_mg_per_100_unit: values.protein_mg_per_100_unit as number,
        user_id: values.user_id as string,
      },
      error: null,
    };
  }

  public async createVariation(
    values: Record<string, unknown>,
  ): Promise<{ data: FoodVariationRow | null; error: unknown | null }> {
    this.createdVariations.push(values);

    return {
      data: makeVariation({
        canonical_food_id: values.canonical_food_id as string | null,
        carbs_mg_per_100_unit: (values.carbs_mg_per_100_unit as number | undefined) ?? null,
        created_by: values.created_by as string,
        household_id: values.household_id as string | null,
        name: values.name as string,
        scope: values.scope as 'household' | 'personal',
        source_context: values.source_context as string | null,
        status: values.status as 'confirmed' | 'promoted' | 'unresolved',
      }),
      error: null,
    };
  }

  public async getVariation(
    id: string,
  ): Promise<{ data: FoodVariationRow | null; error: unknown | null }> {
    return {
      data: this.variations.find((variation) => variation.id === id) ?? null,
      error: null,
    };
  }

  public async searchGlobalFoods(): Promise<{
    data: StoredFoodRow[] | null;
    error: unknown | null;
  }> {
    return { data: this.globalFoods, error: null };
  }

  public async searchHouseholdFoods(): Promise<{
    data: StoredFoodRow[] | null;
    error: unknown | null;
  }> {
    return { data: this.householdFoods, error: null };
  }

  public async searchPersonalFoods(): Promise<{
    data: StoredFoodRow[] | null;
    error: unknown | null;
  }> {
    return { data: this.personalFoods, error: null };
  }

  public async searchVariations(): Promise<{
    data: FoodVariationRow[] | null;
    error: unknown | null;
  }> {
    return { data: this.variations, error: null };
  }

  public async updateVariation(
    id: string,
    values: Record<string, unknown>,
  ): Promise<{ data: FoodVariationRow | null; error: unknown | null }> {
    this.updates.push({ id, ...values });
    const current = this.variations.find((variation) => variation.id === id) ?? makeVariation();
    const updated = {
      ...current,
      ...values,
    } as FoodVariationRow;
    this.variations = this.variations.map((variation) =>
      variation.id === id ? updated : variation,
    );

    return { data: updated, error: null };
  }
}

const makeContext = (supabase = new MockSupabaseClient()): AuthContext => ({
  jwt: 'jwt',
  operation_id: 'op-food-1',
  supabase: supabase as unknown as SupabaseClient,
  user_id: userId,
});

const makeFood = (overrides: Partial<StoredFoodRow> = {}): StoredFoodRow => ({
  brand: 'Fridgr Test',
  canonical_name: 'Greek Yogurt',
  carbs_mg_per_100_unit: 400000,
  category: 'dairy',
  fat_mg_per_100_unit: 300000,
  id: globalId,
  kcal_per_100_unit: 12000,
  nutrition_basis: 'per_100g',
  protein_mg_per_100_unit: 1000000,
  ...overrides,
});

const makeVariation = (overrides: Partial<FoodVariationRow> = {}): FoodVariationRow => ({
  canonical_food_id: globalId,
  carbs_mg_per_100_unit: 400000,
  created_by: userId,
  fat_mg_per_100_unit: 300000,
  household_id: null,
  id: variationId,
  kcal_per_100_unit: 12000,
  name: 'Receipt yogurt',
  nutrition_basis: 'per_100g',
  protein_mg_per_100_unit: 1000000,
  scope: 'personal',
  source_context: 'manual_add',
  status: 'unresolved',
  ...overrides,
});

const readJson = async (response: Response): Promise<unknown> => await response.json();

Deno.test('food catalog endpoints require auth', async () => {
  const response = await handler(
    new Request('https://example.supabase.co/functions/v1/api/v1/foods/search?query=yogurt'),
  );

  assertEquals(response.status, 401);
});

Deno.test('household-scoped search returns 403 for non-members', async () => {
  const service = new FakeCatalogService();
  const supabase = new MockSupabaseClient(null);
  const response = await handleAuthenticatedRequest(
    new Request(
      `https://example.supabase.co/functions/v1/api/v1/foods/search?query=yogurt&household_id=${householdId}`,
    ),
    makeContext(supabase),
    service,
  );

  assertEquals(response.status, 403);
  assertEquals(service.globalFoods.length, 0);
});

Deno.test('global-only search works without household id', async () => {
  const service = new FakeCatalogService();
  service.globalFoods = [makeFood()];

  const response = await executeSearchFoods(service, makeContext(), {
    query: 'yogurt',
    scope: 'global',
  });

  assertEquals(response.status, 200);
  assertEquals(await readJson(response), {
    data: {
      foods: [
        {
          brand: 'Fridgr Test',
          carbs_mg_per_base: 4000,
          category: 'dairy',
          fat_mg_per_base: 3000,
          id: globalId,
          kcal_per_base: 120,
          name: 'Greek Yogurt',
          protein_mg_per_base: 10000,
          serving_base_unit: 'g',
          source_type: 'global',
        },
      ],
    },
    error: null,
    operation_id: 'op-food-1',
  });
});

Deno.test('mixed search returns explicit source types', async () => {
  const service = new FakeCatalogService();
  service.globalFoods = [makeFood()];
  service.personalFoods = [
    makeFood({ canonical_name: undefined, id: personalId, name: 'My Yogurt' }),
  ];
  service.householdFoods = [
    makeFood({
      canonical_name: undefined,
      household_id: householdId,
      id: householdFoodId,
      name: 'House Yogurt',
    }),
  ];
  service.variations = [makeVariation()];

  const response = await executeSearchFoods(service, makeContext(), {
    household_id: householdId,
    query: 'yogurt',
  });
  const body = (await readJson(response)) as {
    data: { foods: ReadonlyArray<{ source_type: string }> };
  };

  assertEquals(response.status, 200);
  assertEquals(
    body.data.foods.map((food) => food.source_type),
    ['global', 'household', 'personal', 'variation'],
  );
});

Deno.test('barcode exact match ranks first when barcode is present', async () => {
  const service = new FakeCatalogService();
  service.globalFoods = [
    makeFood({ barcode: '123', canonical_name: 'Barcode Yogurt', id: globalId }),
    makeFood({
      barcode: null,
      canonical_name: 'Plain Yogurt',
      id: '88888888-8888-4888-8888-888888888888',
    }),
  ];

  const response = await executeSearchFoods(service, makeContext(), {
    barcode: '123',
    query: 'yogurt',
    scope: 'global',
  });
  const body = (await readJson(response)) as {
    data: { foods: ReadonlyArray<{ id: string }> };
  };

  assertEquals(response.status, 200);
  assertEquals(body.data.foods[0]?.id, globalId);
});

Deno.test('create personal food stores g/ml nutrition as per-100-unit values', async () => {
  const service = new FakeCatalogService();
  const response = await executeCreatePersonalFood(service, makeContext(), {
    carbs_mg_per_base: 2000,
    fat_mg_per_base: 3000,
    kcal_per_base: 120,
    name: 'Contract Yogurt',
    protein_mg_per_base: 10000,
    serving_base_unit: 'g',
  });

  assertEquals(response.status, 201);
  assertEquals(service.createdPersonalFoods[0], {
    category: null,
    carbs_mg_per_100_unit: 200000,
    fat_mg_per_100_unit: 300000,
    kcal_per_100_unit: 12000,
    linked_global_id: null,
    name: 'Contract Yogurt',
    notes: null,
    nutrition_basis: 'per_100g',
    protein_mg_per_100_unit: 1000000,
    user_id: userId,
  });
  assertEquals(service.eventWrites, 0);
});

Deno.test('create personal food rejects count serving units', async () => {
  const response = await executeCreatePersonalFood(new FakeCatalogService(), makeContext(), {
    carbs_mg_per_base: 2000,
    fat_mg_per_base: 3000,
    kcal_per_base: 120,
    name: 'Count Yogurt',
    protein_mg_per_base: 10000,
    serving_base_unit: 'count',
  });

  assertEquals(response.status, 422);
});

Deno.test('create unresolved variation', async () => {
  const service = new FakeCatalogService();
  const response = await executeCreateFoodVariation(service, makeContext(), {
    name: 'Receipt yogurt',
    scope: 'personal',
    source_context: 'manual_add',
  });

  assertEquals(response.status, 201);
  assertEquals(service.createdVariations[0]?.status, 'unresolved');
  assertEquals(service.eventWrites, 0);
});

Deno.test('confirm variation', async () => {
  const service = new FakeCatalogService();
  const variation = makeVariation({ status: 'unresolved' });
  service.variations = [variation];

  const response = await executeUpdateFoodVariation(service, makeContext(), variation, {
    status: 'confirmed',
  });

  assertEquals(response.status, 200);
  assertEquals(service.updates[0]?.status, 'confirmed');
});

Deno.test('promote confirmed variation creates a global submission', async () => {
  const service = new FakeCatalogService();
  const variation = makeVariation({ status: 'confirmed' });
  service.variations = [variation];

  const response = await executePromoteFoodVariation(service, makeContext(), variation);

  assertEquals(response.status, 200);
  assertEquals(service.submissions.length, 1);
  assertEquals(service.updates[0]?.status, 'promoted');
  assertEquals(service.eventWrites, 0);
});

Deno.test('reject promote unresolved variation', async () => {
  const response = await executePromoteFoodVariation(
    new FakeCatalogService(),
    makeContext(),
    makeVariation({ status: 'unresolved' }),
  );

  assertEquals(response.status, 409);
});

Deno.test('reject invalid variation status transitions', async () => {
  const variation = makeVariation({ status: 'promoted' });
  const response = await executeUpdateFoodVariation(
    new FakeCatalogService(),
    makeContext(),
    variation,
    {
      status: 'confirmed',
    },
  );

  assertEquals(response.status, 409);
});

Deno.test('household variation update returns 403 for non-members', async () => {
  const service = new FakeCatalogService();
  service.variations = [
    makeVariation({
      household_id: householdId,
      scope: 'household',
      status: 'unresolved',
    }),
  ];
  const response = await handleAuthenticatedRequest(
    new Request(`https://example.supabase.co/functions/v1/api/v1/foods/variations/${variationId}`, {
      body: JSON.stringify({ status: 'confirmed' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    }),
    makeContext(new MockSupabaseClient(null)),
    service,
  );

  assertEquals(response.status, 403);
  assertEquals(service.updates.length, 0);
});
