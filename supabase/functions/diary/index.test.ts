import { assertEquals } from 'jsr:@std/assert@1.0.19';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

import type { AuthContext } from '../_shared/middleware/auth.ts';
import type { HouseholdContext } from '../_shared/middleware/householdGuard.ts';
import {
  type DiaryEntryRow,
  type DiaryService,
  executeCorrectDiaryEntry,
  executeCreateDiaryEntry,
  executeGetDiarySummary,
  executeListDiaryEntries,
} from './index.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const householdId = '22222222-2222-4222-8222-222222222222';
const globalFoodId = '33333333-3333-4333-8333-333333333333';
const diaryEntryId = '44444444-4444-4444-8444-444444444444';
const operationId = '55555555-5555-4555-8555-555555555555';

type UserTargets = Readonly<{
  target_carbs_mg: number | null;
  target_fat_mg: number | null;
  target_kcal: number;
  target_protein_mg: number | null;
}>;

type SummaryTotals = Readonly<{
  entry_count: number;
  total_carbs_mg: number;
  total_fat_mg: number;
  total_kcal: number;
  total_protein_mg: number;
}>;

type RpcEnvelopeRow = Readonly<{
  response_body: unknown;
  response_code: number;
}>;

class FakeDiaryService implements DiaryService {
  public entries: DiaryEntryRow[] = [];
  public summaries: Record<string, unknown>[] = [];
  public targets: UserTargets | null = {
    target_carbs_mg: 250000,
    target_fat_mg: 70000,
    target_kcal: 2200,
    target_protein_mg: 120000,
  };

  public async createDiaryEntryTransaction(
    requestedUserId: string,
    requestedOperationId: string,
    request: Readonly<{
      base_unit: 'count_each' | 'mass_mg' | 'volume_ml';
      carbs_mg: number;
      confidence?: number;
      fat_mg: number;
      food_name: string;
      household_id: string;
      is_quick_estimate?: boolean;
      kcal: number;
      logged_at: string;
      protein_mg: number;
      quantity_base: number;
      source_id?: string;
      source_scope: string;
    }>,
  ): Promise<{ data: RpcEnvelopeRow | null; error: unknown | null }> {
    const row = makeDiaryEntry({
      base_unit: request.base_unit,
      carbs_mg: request.carbs_mg,
      confidence: request.confidence ?? null,
      fat_mg: request.fat_mg,
      food_name: request.food_name,
      household_id: request.household_id,
      is_quick_estimate: request.is_quick_estimate ?? false,
      kcal: Math.round(request.kcal),
      logged_at: request.logged_at,
      protein_mg: request.protein_mg,
      quantity_base: request.quantity_base,
      source_global_food_id: request.source_scope === 'global' ? (request.source_id ?? null) : null,
      source_scope: request.source_scope as DiaryEntryRow['source_scope'],
      user_id: requestedUserId,
    });
    this.entries.push(row);
    const totals = summarize(this.entries.filter((entry) => entry.user_id === requestedUserId));
    this.summaries.push({
      date: request.logged_at.slice(0, 10),
      ...totals,
      user_id: requestedUserId,
    });

    return {
      data: makeRpcEnvelope(
        201,
        {
          daily_summary: totals,
          diary_entry: mapEntryForTest(row),
        },
        requestedOperationId,
      ),
      error: null,
    };
  }

  public async correctDiaryEntryTransaction(
    requestedUserId: string,
    requestedOperationId: string,
    entryId: string,
    request: Readonly<{
      replacement: Readonly<{
        base_unit: 'count_each' | 'mass_mg' | 'volume_ml';
        carbs_mg: number;
        confidence?: number;
        fat_mg: number;
        food_name: string;
        is_quick_estimate?: boolean;
        kcal: number;
        logged_at?: string;
        protein_mg: number;
        quantity_base: number;
        source_id?: string;
        source_scope?: string;
      }>;
    }>,
  ): Promise<{ data: RpcEnvelopeRow | null; error: unknown | null }> {
    const original = this.entries.find((entry) => entry.id === entryId);

    if (!original) {
      return {
        data: makeRpcEnvelope(404, null, requestedOperationId, {
          code: 'not_found',
          message: 'diary entry not found',
        }),
        error: null,
      };
    }

    if (original.is_correction || original.corrects_entry_id !== null) {
      return {
        data: makeRpcEnvelope(409, null, requestedOperationId, {
          code: 'conflict',
          message: 'diary entry cannot be corrected',
        }),
        error: null,
      };
    }

    if (
      this.entries.some((entry) => entry.corrects_entry_id === original.id && entry.is_correction)
    ) {
      return {
        data: makeRpcEnvelope(409, null, requestedOperationId, {
          code: 'conflict',
          message: 'diary entry has already been corrected',
        }),
        error: null,
      };
    }

    const correction = makeDiaryEntry({
      carbs_mg: -original.carbs_mg,
      corrects_entry_id: original.id,
      fat_mg: -original.fat_mg,
      food_name: `Correction for ${original.food_name}`,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      is_correction: true,
      kcal: -original.kcal,
      logged_at: original.logged_at,
      protein_mg: -original.protein_mg,
      source_scope: original.source_scope,
      user_id: requestedUserId,
    });
    const replacement = makeDiaryEntry({
      base_unit: request.replacement.base_unit,
      carbs_mg: request.replacement.carbs_mg,
      corrects_entry_id: original.id,
      fat_mg: request.replacement.fat_mg,
      food_name: request.replacement.food_name,
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      kcal: request.replacement.kcal,
      logged_at: request.replacement.logged_at ?? original.logged_at,
      protein_mg: request.replacement.protein_mg,
      quantity_base: request.replacement.quantity_base,
      source_scope: (request.replacement.source_scope ??
        original.source_scope) as DiaryEntryRow['source_scope'],
      user_id: requestedUserId,
    });

    this.entries.push(correction, replacement);
    const totals = summarize(this.entries.filter((entry) => entry.user_id === requestedUserId));

    return {
      data: makeRpcEnvelope(
        201,
        {
          correction_entry: mapEntryForTest(correction),
          daily_summary: totals,
          replacement_entry: mapEntryForTest(replacement),
        },
        requestedOperationId,
      ),
      error: null,
    };
  }

  public async listDiaryEntries(
    requestedUserId: string,
    query: Readonly<{ date: string; household_id?: string }>,
  ): Promise<{ data: DiaryEntryRow[] | null; error: unknown | null }> {
    return {
      data: this.entries.filter(
        (entry) =>
          entry.user_id === requestedUserId &&
          entry.logged_at.startsWith(query.date) &&
          (!query.household_id || entry.household_id === query.household_id),
      ),
      error: null,
    };
  }

  public async getUserTargets(): Promise<{
    data: UserTargets | null;
    error: unknown | null;
  }> {
    return { data: this.targets, error: null };
  }
}

const makeAuthContext = (overrides: Partial<AuthContext> = {}): AuthContext => ({
  jwt: 'jwt',
  operation_id: operationId,
  supabase: {} as SupabaseClient,
  user_id: userId,
  ...overrides,
});

const makeHouseholdContext = (overrides: Partial<HouseholdContext> = {}): HouseholdContext => ({
  ...makeAuthContext(overrides),
  household_id: householdId,
  role: 'member',
  ...overrides,
});

const makeDiaryEntry = (overrides: Partial<DiaryEntryRow> = {}): DiaryEntryRow => ({
  base_unit: 'mass_mg',
  carbs_mg: 12000,
  confidence: null,
  corrects_entry_id: null,
  created_at: '2026-04-25T09:01:00.000Z',
  fat_mg: 3000,
  food_name: 'Greek Yogurt',
  household_id: householdId,
  id: diaryEntryId,
  is_correction: false,
  is_quick_estimate: false,
  kcal: 120,
  logged_at: '2026-04-25T09:00:00.000Z',
  protein_mg: 10000,
  quantity_base: 100000,
  serve_split_event_id: null,
  source: 'manual',
  source_dish_batch_id: null,
  source_fridge_item_id: null,
  source_global_food_id: globalFoodId,
  source_household_food_item_id: null,
  source_personal_food_id: null,
  source_private_inventory_item_id: null,
  source_scope: 'global',
  user_id: userId,
  ...overrides,
});

const mapEntryForTest = (entry: DiaryEntryRow) => ({
  base_unit: entry.base_unit,
  carbs_mg: entry.carbs_mg,
  confidence: entry.confidence,
  corrects_entry_id: entry.corrects_entry_id,
  created_at: entry.created_at,
  fat_mg: entry.fat_mg,
  food_name: entry.food_name,
  household_id: entry.household_id,
  id: entry.id,
  is_correction: entry.is_correction,
  is_quick_estimate: entry.is_quick_estimate,
  kcal: entry.kcal,
  logged_at: entry.logged_at,
  protein_mg: entry.protein_mg,
  quantity_base: entry.quantity_base,
  source_scope: entry.source_scope,
});

const summarize = (entries: readonly DiaryEntryRow[]): SummaryTotals => ({
  entry_count: entries.length,
  total_carbs_mg: entries.reduce((total, entry) => total + entry.carbs_mg, 0),
  total_fat_mg: entries.reduce((total, entry) => total + entry.fat_mg, 0),
  total_kcal: entries.reduce((total, entry) => total + entry.kcal, 0),
  total_protein_mg: entries.reduce((total, entry) => total + entry.protein_mg, 0),
});

const makeRpcEnvelope = (
  responseCode: number,
  data: unknown,
  requestedOperationId: string,
  error: unknown = null,
): RpcEnvelopeRow => ({
  response_body: {
    data,
    error,
    operation_id: requestedOperationId,
  },
  response_code: responseCode,
});

const readJson = async (response: Response): Promise<unknown> => await response.json();

Deno.test('create diary entry delegates to the transactional RPC response', async () => {
  const service = new FakeDiaryService();
  const response = await executeCreateDiaryEntry(service, makeHouseholdContext(), {
    base_unit: 'mass_mg',
    carbs_mg: 12000,
    fat_mg: 3000,
    food_name: 'Greek Yogurt',
    household_id: householdId,
    kcal: 120,
    logged_at: '2026-04-25T09:00:00.000Z',
    protein_mg: 10000,
    quantity_base: 100000,
    source_id: globalFoodId,
    source_scope: 'global',
  });
  const body = (await readJson(response)) as {
    data: {
      daily_summary: { total_kcal: number };
      diary_entry: { id: string; source_scope: string };
    };
  };

  assertEquals(response.status, 201);
  assertEquals(body.data.diary_entry.id, diaryEntryId);
  assertEquals(body.data.diary_entry.source_scope, 'global');
  assertEquals(body.data.daily_summary.total_kcal, 120);
  assertEquals(service.entries[0]?.source_global_food_id, globalFoodId);
  assertEquals(service.summaries[0], {
    date: '2026-04-25',
    entry_count: 1,
    total_carbs_mg: 12000,
    total_fat_mg: 3000,
    total_kcal: 120,
    total_protein_mg: 10000,
    user_id: userId,
  });
});

Deno.test('create diary entry requires an operation id before writing', async () => {
  const service = new FakeDiaryService();
  const response = await executeCreateDiaryEntry(
    service,
    makeHouseholdContext({ operation_id: undefined }),
    {
      base_unit: 'mass_mg',
      carbs_mg: 12000,
      fat_mg: 3000,
      food_name: 'Greek Yogurt',
      household_id: householdId,
      kcal: 120,
      logged_at: '2026-04-25T09:00:00.000Z',
      protein_mg: 10000,
      quantity_base: 100000,
      source_scope: 'quick_estimate',
    },
  );

  assertEquals(response.status, 400);
  assertEquals(service.entries.length, 0);
});

Deno.test('list diary entries returns only the requested day and household', async () => {
  const service = new FakeDiaryService();
  service.entries = [
    makeDiaryEntry(),
    makeDiaryEntry({
      id: '66666666-6666-4666-8666-666666666666',
      logged_at: '2026-04-26T09:00:00.000Z',
    }),
    makeDiaryEntry({
      household_id: '77777777-7777-4777-8777-777777777777',
      id: '88888888-8888-4888-8888-888888888888',
    }),
  ];

  const response = await executeListDiaryEntries(service, makeAuthContext(), {
    date: '2026-04-25',
    household_id: householdId,
  });
  const body = (await readJson(response)) as { data: { entries: ReadonlyArray<{ id: string }> } };

  assertEquals(response.status, 200);
  assertEquals(
    body.data.entries.map((entry) => entry.id),
    [diaryEntryId],
  );
});

Deno.test('correct diary entry uses replacement-style append-only response', async () => {
  const service = new FakeDiaryService();
  service.entries = [makeDiaryEntry()];

  const response = await executeCorrectDiaryEntry(service, makeAuthContext(), diaryEntryId, {
    reason: 'Wrong quantity',
    replacement: {
      base_unit: 'mass_mg',
      carbs_mg: 18000,
      fat_mg: 4500,
      food_name: 'Greek Yogurt',
      kcal: 180,
      protein_mg: 15000,
      quantity_base: 150000,
      source_id: globalFoodId,
      source_scope: 'global',
    },
  });
  const body = (await readJson(response)) as {
    data: {
      correction_entry: { corrects_entry_id: string; is_correction: boolean; kcal: number };
      replacement_entry: { corrects_entry_id: string; is_correction: boolean; kcal: number };
    };
  };

  assertEquals(response.status, 201);
  assertEquals(body.data.correction_entry.is_correction, true);
  assertEquals(body.data.correction_entry.corrects_entry_id, diaryEntryId);
  assertEquals(body.data.correction_entry.kcal, -120);
  assertEquals(body.data.replacement_entry.is_correction, false);
  assertEquals(body.data.replacement_entry.corrects_entry_id, diaryEntryId);
  assertEquals(body.data.replacement_entry.kcal, 180);
  assertEquals(service.entries[0]?.kcal, 120);
});

Deno.test('list diary entries hides correction ledger rows and corrected originals', async () => {
  const service = new FakeDiaryService();
  service.entries = [
    makeDiaryEntry(),
    makeDiaryEntry({
      corrects_entry_id: diaryEntryId,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      is_correction: true,
      kcal: -120,
    }),
    makeDiaryEntry({
      corrects_entry_id: diaryEntryId,
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      kcal: 180,
    }),
  ];

  const response = await executeListDiaryEntries(service, makeAuthContext(), {
    date: '2026-04-25',
    household_id: householdId,
  });
  const body = (await readJson(response)) as {
    data: { entries: ReadonlyArray<{ id: string; kcal: number }> };
  };

  assertEquals(response.status, 200);
  assertEquals(
    body.data.entries.map((entry) => ({ id: entry.id, kcal: entry.kcal })),
    [
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        kcal: 180,
      },
    ],
  );
});

Deno.test('correct diary entry rejects already corrected originals', async () => {
  const service = new FakeDiaryService();
  service.entries = [
    makeDiaryEntry(),
    makeDiaryEntry({
      corrects_entry_id: diaryEntryId,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      is_correction: true,
    }),
  ];

  const response = await executeCorrectDiaryEntry(service, makeAuthContext(), diaryEntryId, {
    replacement: {
      base_unit: 'mass_mg',
      carbs_mg: 18000,
      fat_mg: 4500,
      food_name: 'Greek Yogurt',
      kcal: 180,
      protein_mg: 15000,
      quantity_base: 150000,
    },
  });
  const body = (await readJson(response)) as { error: { code: string } };

  assertEquals(response.status, 409);
  assertEquals(body.error.code, 'conflict');
});

Deno.test('summary computes totals, targets, and remaining macros from entries', async () => {
  const service = new FakeDiaryService();
  service.entries = [
    makeDiaryEntry(),
    makeDiaryEntry({
      carbs_mg: 8000,
      fat_mg: 2000,
      id: '66666666-6666-4666-8666-666666666666',
      kcal: 80,
      protein_mg: 5000,
    }),
  ];

  const response = await executeGetDiarySummary(service, makeAuthContext(), {
    date: '2026-04-25',
    household_id: householdId,
  });
  const body = (await readJson(response)) as {
    data: {
      remaining: {
        carbs_mg: number | null;
        fat_mg: number | null;
        kcal: number;
        protein_mg: number | null;
      };
      summary: {
        entry_count: number;
        total_carbs_mg: number;
        total_fat_mg: number;
        total_kcal: number;
        total_protein_mg: number;
      };
      targets: { target_kcal: number };
    };
  };

  assertEquals(response.status, 200);
  assertEquals(body.data.summary, {
    entry_count: 2,
    total_carbs_mg: 20000,
    total_fat_mg: 5000,
    total_kcal: 200,
    total_protein_mg: 15000,
  });
  assertEquals(body.data.targets.target_kcal, 2200);
  assertEquals(body.data.remaining, {
    carbs_mg: 230000,
    fat_mg: 65000,
    kcal: 2000,
    protein_mg: 105000,
  });
});

Deno.test('summary ignores correction ledger rows and corrected originals', async () => {
  const service = new FakeDiaryService();
  service.entries = [
    makeDiaryEntry(),
    makeDiaryEntry({
      corrects_entry_id: diaryEntryId,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      is_correction: true,
      kcal: -120,
    }),
    makeDiaryEntry({
      carbs_mg: 18000,
      corrects_entry_id: diaryEntryId,
      fat_mg: 4500,
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      kcal: 180,
      protein_mg: 15000,
    }),
  ];

  const response = await executeGetDiarySummary(service, makeAuthContext(), {
    date: '2026-04-25',
    household_id: householdId,
  });
  const body = (await readJson(response)) as {
    data: {
      summary: {
        entry_count: number;
        total_carbs_mg: number;
        total_fat_mg: number;
        total_kcal: number;
        total_protein_mg: number;
      };
    };
  };

  assertEquals(response.status, 200);
  assertEquals(body.data.summary, {
    entry_count: 1,
    total_carbs_mg: 18000,
    total_fat_mg: 4500,
    total_kcal: 180,
    total_protein_mg: 15000,
  });
});
