import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

import { getServiceClient } from '../_shared/db/client.ts';
import { err, handleOptions } from '../_shared/helpers/response.ts';
import { ok } from '../_shared/helpers/response.ts';
import { UuidV4, validate } from '../_shared/helpers/validate.ts';
import { type AuthContext, extractOperationId, withAuth } from '../_shared/middleware/auth.ts';
import { type HouseholdContext, withHousehold } from '../_shared/middleware/householdGuard.ts';
import {
  correctDiaryEntrySchema,
  createDiaryEntrySchema,
  diaryEntriesQuerySchema,
  diarySummaryQuerySchema,
} from '../_shared/types/schemas/diary.ts';

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const DIARY_SEGMENT = 'diary';
const DIARY_ENTRY_SELECT =
  'id,user_id,household_id,food_name,source_scope,source_global_food_id,source_personal_food_id,source_household_food_item_id,source_private_inventory_item_id,source_fridge_item_id,source_dish_batch_id,quantity_base,base_unit,kcal,protein_mg,carbs_mg,fat_mg,source,confidence,is_quick_estimate,is_correction,corrects_entry_id,serve_split_event_id,logged_at,created_at';

type BaseUnit = 'count_each' | 'mass_mg' | 'volume_ml';
type SourceScope =
  | 'dish_batch'
  | 'fridge'
  | 'global'
  | 'household'
  | 'personal'
  | 'private_inventory'
  | 'quick_estimate';

type CreateDiaryEntryRequest = Readonly<{
  base_unit: BaseUnit;
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
}>;

type CorrectDiaryEntryRequest = Readonly<{
  reason?: string;
  replacement: Readonly<{
    base_unit: BaseUnit;
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
}>;

type DiaryEntriesQuery = Readonly<{
  date: string;
  household_id?: string;
}>;

export type DiaryEntryRow = Readonly<{
  base_unit: BaseUnit;
  carbs_mg: number;
  confidence: number | null;
  corrects_entry_id: string | null;
  created_at: string;
  fat_mg: number;
  food_name: string;
  household_id: string;
  id: string;
  is_correction: boolean;
  is_quick_estimate: boolean;
  kcal: number;
  logged_at: string;
  protein_mg: number;
  quantity_base: number;
  serve_split_event_id: string | null;
  source: string | null;
  source_dish_batch_id: string | null;
  source_fridge_item_id: string | null;
  source_global_food_id: string | null;
  source_household_food_item_id: string | null;
  source_personal_food_id: string | null;
  source_private_inventory_item_id: string | null;
  source_scope: SourceScope;
  user_id: string;
}>;

type UserTargetsRow = Readonly<{
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

export type DiaryService = Readonly<{
  correctDiaryEntryTransaction: (
    userId: string,
    operationId: string,
    entryId: string,
    request: CorrectDiaryEntryRequest,
  ) => Promise<{ data: RpcEnvelopeRow | null; error: unknown | null }>;
  createDiaryEntryTransaction: (
    userId: string,
    operationId: string,
    request: CreateDiaryEntryRequest,
  ) => Promise<{ data: RpcEnvelopeRow | null; error: unknown | null }>;
  getUserTargets: (
    userId: string,
  ) => Promise<{ data: UserTargetsRow | null; error: unknown | null }>;
  listDiaryEntries: (
    userId: string,
    query: DiaryEntriesQuery,
  ) => Promise<{ data: DiaryEntryRow[] | null; error: unknown | null }>;
}>;

const getRouteSegments = (request: Request): string[] => {
  const segments = new URL(request.url).pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const diaryIndex = segments.lastIndexOf(DIARY_SEGMENT);

  return diaryIndex === -1 ? segments : segments.slice(diaryIndex + 1);
};

const notFound = (request: Request): Response =>
  err('not_found', 'not found', 404, undefined, extractOperationId(request));

const isListDiaryEntriesRoute = (request: Request, segments: readonly string[]): boolean =>
  request.method === 'GET' && segments.length === 1 && segments[0] === 'entries';

const isCreateDiaryEntryRoute = (request: Request, segments: readonly string[]): boolean =>
  request.method === 'POST' && segments.length === 1 && segments[0] === 'entries';

const isCorrectDiaryEntryRoute = (request: Request, segments: readonly string[]): boolean =>
  request.method === 'POST' &&
  segments.length === 3 &&
  segments[0] === 'entries' &&
  (segments[1]?.length ?? 0) > 0 &&
  segments[2] === 'correct';

const getDiaryEntryIdFromRoute = (segments: readonly string[]): string | null =>
  segments[0] === 'entries' ? (segments[1] ?? null) : null;

const isDiarySummaryRoute = (request: Request, segments: readonly string[]): boolean =>
  request.method === 'GET' && segments.length === 1 && segments[0] === 'summary';

const getDayAfter = (date: string): string => {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return nextDate.toISOString().slice(0, 10);
};

const isSourceScope = (value: string): value is SourceScope =>
  [
    'dish_batch',
    'fridge',
    'global',
    'household',
    'personal',
    'private_inventory',
    'quick_estimate',
  ].includes(value);

const getVisibleDiaryEntries = (entries: readonly DiaryEntryRow[]): DiaryEntryRow[] => {
  const correctedOriginalIds = new Set(
    entries
      .filter((entry) => entry.is_correction && entry.corrects_entry_id)
      .map((entry) => entry.corrects_entry_id),
  );

  return entries.filter((entry) => !entry.is_correction && !correctedOriginalIds.has(entry.id));
};

const summarizeEntries = (entries: readonly DiaryEntryRow[]): SummaryTotals =>
  entries.reduce<SummaryTotals>(
    (totals, entry) => ({
      entry_count: totals.entry_count + 1,
      total_carbs_mg: totals.total_carbs_mg + entry.carbs_mg,
      total_fat_mg: totals.total_fat_mg + entry.fat_mg,
      total_kcal: totals.total_kcal + entry.kcal,
      total_protein_mg: totals.total_protein_mg + entry.protein_mg,
    }),
    {
      entry_count: 0,
      total_carbs_mg: 0,
      total_fat_mg: 0,
      total_kcal: 0,
      total_protein_mg: 0,
    },
  );

const mapDiaryEntry = (row: DiaryEntryRow) => ({
  base_unit: row.base_unit,
  carbs_mg: row.carbs_mg,
  confidence: row.confidence,
  corrects_entry_id: row.corrects_entry_id,
  created_at: row.created_at,
  fat_mg: row.fat_mg,
  food_name: row.food_name,
  household_id: row.household_id,
  id: row.id,
  is_correction: row.is_correction,
  is_quick_estimate: row.is_quick_estimate,
  kcal: row.kcal,
  logged_at: row.logged_at,
  protein_mg: row.protein_mg,
  quantity_base: row.quantity_base,
  source_scope: row.source_scope,
});

const mapSummary = (totals: SummaryTotals) => ({
  entry_count: totals.entry_count,
  total_carbs_mg: totals.total_carbs_mg,
  total_fat_mg: totals.total_fat_mg,
  total_kcal: totals.total_kcal,
  total_protein_mg: totals.total_protein_mg,
});

const mapTargets = (row: UserTargetsRow | null) => ({
  target_carbs_mg: row?.target_carbs_mg ?? null,
  target_fat_mg: row?.target_fat_mg ?? null,
  target_kcal: row?.target_kcal ?? 2000,
  target_protein_mg: row?.target_protein_mg ?? null,
});

const mapRemaining = (totals: SummaryTotals, targets: ReturnType<typeof mapTargets>) => ({
  carbs_mg:
    targets.target_carbs_mg === null ? null : targets.target_carbs_mg - totals.total_carbs_mg,
  fat_mg: targets.target_fat_mg === null ? null : targets.target_fat_mg - totals.total_fat_mg,
  kcal: targets.target_kcal - totals.total_kcal,
  protein_mg:
    targets.target_protein_mg === null ? null : targets.target_protein_mg - totals.total_protein_mg,
});

const buildJsonHeaders = (): Headers => {
  const headers = new Headers();

  headers.set('Access-Control-Allow-Origin', '*');
  headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, Idempotency-Key, Content-Type, apikey',
  );
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  headers.set('Content-Type', 'application/json; charset=utf-8');

  return headers;
};

const rpcEnvelopeResponse = (row: RpcEnvelopeRow): Response =>
  new Response(JSON.stringify(row.response_body), {
    headers: buildJsonHeaders(),
    status: row.response_code,
  });

const rpcErrorResponse = (errorMessage: string, operationId?: string): Response =>
  err('internal_error', errorMessage, 500, undefined, operationId);

export const createDiaryService = (
  supabase: SupabaseClient,
  rpcSupabase: SupabaseClient = getServiceClient(),
): DiaryService => ({
  correctDiaryEntryTransaction: async (userId, operationId, entryId, request) => {
    const result = await rpcSupabase
      .rpc('correct_diary_entry_transaction', {
        p_operation_id: operationId,
        p_original_entry_id: entryId,
        p_request: request,
        p_user_id: userId,
      })
      .single<RpcEnvelopeRow>();

    return result as { data: RpcEnvelopeRow | null; error: unknown | null };
  },
  createDiaryEntryTransaction: async (userId, operationId, request) => {
    const result = await rpcSupabase
      .rpc('create_diary_entry_transaction', {
        p_operation_id: operationId,
        p_request: request,
        p_user_id: userId,
      })
      .single<RpcEnvelopeRow>();

    return result as { data: RpcEnvelopeRow | null; error: unknown | null };
  },
  getUserTargets: async (userId) => {
    const result = await supabase
      .from('users')
      .select('target_kcal,target_protein_mg,target_carbs_mg,target_fat_mg')
      .eq('id', userId)
      .maybeSingle<UserTargetsRow>();

    return result;
  },
  listDiaryEntries: async (userId, query) => {
    const request = supabase
      .from('diary_entries')
      .select(DIARY_ENTRY_SELECT)
      .eq('user_id', userId)
      .gte('logged_at', `${query.date}T00:00:00.000Z`)
      .lt('logged_at', `${getDayAfter(query.date)}T00:00:00.000Z`)
      .order('logged_at', { ascending: false });

    if (query.household_id) {
      request.eq('household_id', query.household_id);
    }

    const result = await request;

    return result as { data: DiaryEntryRow[] | null; error: unknown | null };
  },
});

const rebuildSummary = async (
  service: DiaryService,
  userId: string,
  query: DiaryEntriesQuery,
): Promise<
  | Readonly<{
      ok: false;
      response: Response;
    }>
  | Readonly<{
      entries: DiaryEntryRow[];
      ok: true;
      totals: SummaryTotals;
    }>
> => {
  const { data, error } = await service.listDiaryEntries(userId, query);

  if (error) {
    return {
      ok: false,
      response: err('internal_error', 'failed to list diary entries', 500),
    };
  }

  const entries = getVisibleDiaryEntries(data ?? []);

  return {
    entries,
    ok: true,
    totals: summarizeEntries(entries),
  };
};

export const executeGetDiarySummary = async (
  service: DiaryService,
  context: AuthContext,
  query: DiaryEntriesQuery,
): Promise<Response> => {
  const summaryResult = await rebuildSummary(service, context.user_id, query);

  if (!summaryResult.ok) {
    return summaryResult.response;
  }

  const { data: targets, error } = await service.getUserTargets(context.user_id);

  if (error) {
    return err(
      'internal_error',
      'failed to load macro targets',
      500,
      undefined,
      context.operation_id,
    );
  }

  const mappedTargets = mapTargets(targets);

  return ok(
    {
      date: query.date,
      remaining: mapRemaining(summaryResult.totals, mappedTargets),
      summary: mapSummary(summaryResult.totals),
      targets: mappedTargets,
    },
    context.operation_id,
  );
};

export const executeListDiaryEntries = async (
  service: DiaryService,
  context: AuthContext,
  query: DiaryEntriesQuery,
): Promise<Response> => {
  const { data, error } = await service.listDiaryEntries(context.user_id, query);

  if (error) {
    return err(
      'internal_error',
      'failed to list diary entries',
      500,
      undefined,
      context.operation_id,
    );
  }

  return ok(
    {
      entries: getVisibleDiaryEntries(data ?? []).map(mapDiaryEntry),
    },
    context.operation_id,
  );
};

export const executeCreateDiaryEntry = async (
  service: DiaryService,
  context: HouseholdContext,
  request: CreateDiaryEntryRequest,
): Promise<Response> => {
  if (!context.operation_id) {
    return err(
      'bad_request',
      'Idempotency-Key header is required for diary mutations',
      400,
      undefined,
      context.operation_id,
    );
  }

  if (!isSourceScope(request.source_scope)) {
    return err(
      'validation_failed',
      'source_scope is not supported',
      422,
      undefined,
      context.operation_id,
    );
  }

  const { data, error } = await service.createDiaryEntryTransaction(
    context.user_id,
    context.operation_id,
    request,
  );

  if (error || !data) {
    return rpcErrorResponse('failed to create diary entry transaction', context.operation_id);
  }

  return rpcEnvelopeResponse(data);
};

export const executeCorrectDiaryEntry = async (
  service: DiaryService,
  context: AuthContext,
  entryId: string,
  request: CorrectDiaryEntryRequest,
): Promise<Response> => {
  if (!context.operation_id) {
    return err(
      'bad_request',
      'Idempotency-Key header is required for diary mutations',
      400,
      undefined,
      context.operation_id,
    );
  }

  const sourceScope = request.replacement.source_scope;

  if (sourceScope && !isSourceScope(sourceScope)) {
    return err(
      'validation_failed',
      'replacement.source_scope is not supported',
      422,
      undefined,
      context.operation_id,
    );
  }

  const { data, error } = await service.correctDiaryEntryTransaction(
    context.user_id,
    context.operation_id,
    entryId,
    request,
  );

  if (error || !data) {
    return rpcErrorResponse('failed to correct diary entry transaction', context.operation_id);
  }

  return rpcEnvelopeResponse(data);
};

const createDiaryEntryHandler = withHousehold({ householdIdFrom: 'body' })(async (
  request,
  context,
): Promise<Response> => {
  const validation = await validate(createDiaryEntrySchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return await executeCreateDiaryEntry(
    createDiaryService(context.supabase),
    context,
    validation.data,
  );
});

const correctDiaryEntryHandler = async (request: Request, entryId: string): Promise<Response> => {
  const validation = await validate(correctDiaryEntrySchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return await withAuth(
    request,
    async (_authenticatedRequest, context) =>
      await executeCorrectDiaryEntry(
        createDiaryService(context.supabase),
        context,
        entryId,
        validation.data,
      ),
  );
};

const diarySummaryHandler = async (request: Request): Promise<Response> => {
  const validation = await validate(diarySummaryQuerySchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return await withAuth(request, async (authenticatedRequest, context) => {
    if (validation.data.household_id) {
      return await withHousehold({ householdIdFrom: () => validation.data.household_id })(
        async (_guardedRequest, householdContext) =>
          await executeGetDiarySummary(
            createDiaryService(householdContext.supabase),
            householdContext,
            validation.data,
          ),
      )(authenticatedRequest, context);
    }

    return await executeGetDiarySummary(
      createDiaryService(context.supabase),
      context,
      validation.data,
    );
  });
};

const listDiaryEntriesHandler = async (request: Request): Promise<Response> => {
  const validation = await validate(diaryEntriesQuerySchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return await withAuth(request, async (authenticatedRequest, context) => {
    if (validation.data.household_id) {
      return await withHousehold({ householdIdFrom: () => validation.data.household_id })(
        async (_guardedRequest, householdContext) =>
          await executeListDiaryEntries(
            createDiaryService(householdContext.supabase),
            householdContext,
            validation.data,
          ),
      )(authenticatedRequest, context);
    }

    return await executeListDiaryEntries(
      createDiaryService(context.supabase),
      context,
      validation.data,
    );
  });
};

const handler = async (request: Request): Promise<Response> => {
  const preflightResponse = handleOptions(request);

  if (preflightResponse) {
    return preflightResponse;
  }

  const routeSegments = getRouteSegments(request);

  if (isListDiaryEntriesRoute(request, routeSegments)) {
    return await listDiaryEntriesHandler(request);
  }

  if (isCreateDiaryEntryRoute(request, routeSegments)) {
    return withAuth(request, createDiaryEntryHandler);
  }

  if (isCorrectDiaryEntryRoute(request, routeSegments)) {
    const entryId = getDiaryEntryIdFromRoute(routeSegments);

    if (!entryId || !UuidV4.safeParse(entryId).success) {
      return notFound(request);
    }

    return await correctDiaryEntryHandler(request, entryId);
  }

  if (isDiarySummaryRoute(request, routeSegments)) {
    return await diarySummaryHandler(request);
  }

  return notFound(request);
};

export { handler };

if (import.meta.main) {
  Deno.serve(handler);
}
