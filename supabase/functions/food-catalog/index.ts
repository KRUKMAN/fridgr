import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

import { err, handleOptions, ok } from '../_shared/helpers/response.ts';
import { validate } from '../_shared/helpers/validate.ts';
import { type AuthContext, extractOperationId, withAuth } from '../_shared/middleware/auth.ts';
import { type HouseholdContext, withHousehold } from '../_shared/middleware/householdGuard.ts';
import {
  createFoodVariationSchema,
  createPersonalFoodSchema,
  searchFoodsSchema,
  updateFoodVariationSchema,
} from '../_shared/types/schemas/catalog.ts';

type CatalogRoute =
  | 'createFoodVariation'
  | 'createPersonalFood'
  | 'promoteFoodVariation'
  | 'searchFoods'
  | 'updateFoodVariation';

type ServingBaseUnit = 'count' | 'g' | 'ml';
type NutritionBasis = 'per_100g' | 'per_100ml';
type FoodSourceType = 'global' | 'household' | 'personal' | 'variation';
type FoodVariationScope = 'household' | 'personal';
type FoodVariationStatus = 'confirmed' | 'promoted' | 'unresolved';

type SearchFoodsRequest = Readonly<{
  barcode?: string;
  household_id?: string;
  query?: string;
  scope?: 'all' | 'global' | 'household' | 'personal';
}>;

type CreatePersonalFoodRequest = Readonly<{
  brand?: string;
  carbs_mg_per_base: number;
  category?: string;
  fat_mg_per_base: number;
  kcal_per_base: number;
  linked_global_id?: string;
  name: string;
  protein_mg_per_base: number;
  serving_base_unit: ServingBaseUnit;
}>;

type CreateFoodVariationRequest = Readonly<{
  canonical_food_id?: string;
  household_id?: string;
  name: string;
  nutrition?: NutritionFields;
  scope: FoodVariationScope;
  source_context?: string;
}>;

type UpdateFoodVariationRequest = Readonly<{
  name?: string;
  nutrition?: NutritionFields;
  status?: FoodVariationStatus;
}>;

type NutritionFields = Readonly<{
  carbs_mg?: number;
  fat_mg?: number;
  kcal?: number;
  protein_mg?: number;
}>;

export type StoredFoodRow = Readonly<{
  archived_at?: string | null;
  barcode?: string | null;
  brand?: string | null;
  canonical_name?: string;
  carbs_mg_per_100_unit: number | null;
  category?: string | null;
  fat_mg_per_100_unit: number | null;
  household_id?: string | null;
  id: string;
  kcal_per_100_unit: number | null;
  name?: string;
  nutrition_basis: NutritionBasis;
  protein_mg_per_100_unit: number | null;
  quality_score?: number | null;
  status?: FoodVariationStatus;
  user_id?: string;
}>;

export type FoodVariationRow = StoredFoodRow &
  Readonly<{
    canonical_food_id: string | null;
    created_by: string;
    household_id: string | null;
    name: string;
    scope: FoodVariationScope;
    source_context: string | null;
    status: FoodVariationStatus;
  }>;

type FoodSearchResult = Readonly<{
  brand: string | null;
  carbs_mg_per_base: number | null;
  category: string | null;
  fat_mg_per_base: number | null;
  id: string;
  kcal_per_base: number | null;
  name: string;
  protein_mg_per_base: number | null;
  serving_base_unit: 'g' | 'ml';
  source_type: FoodSourceType;
  status?: FoodVariationStatus;
}>;

export type CatalogService = Readonly<{
  createGlobalSubmission: (
    values: Readonly<{
      proposed_name: string;
      proposed_payload: Record<string, unknown>;
      submitted_by: string;
    }>,
  ) => Promise<{ data: { id: string } | null; error: unknown | null }>;
  createPersonalFood: (values: Record<string, unknown>) => Promise<{
    data: StoredFoodRow | null;
    error: unknown | null;
  }>;
  createVariation: (values: Record<string, unknown>) => Promise<{
    data: FoodVariationRow | null;
    error: unknown | null;
  }>;
  getVariation: (id: string) => Promise<{ data: FoodVariationRow | null; error: unknown | null }>;
  searchGlobalFoods: (request: SearchFoodsRequest) => Promise<{
    data: StoredFoodRow[] | null;
    error: unknown | null;
  }>;
  searchHouseholdFoods: (
    request: SearchFoodsRequest & Readonly<{ household_id: string }>,
  ) => Promise<{ data: StoredFoodRow[] | null; error: unknown | null }>;
  searchPersonalFoods: (
    request: SearchFoodsRequest,
    userId: string,
  ) => Promise<{ data: StoredFoodRow[] | null; error: unknown | null }>;
  searchVariations: (
    request: SearchFoodsRequest,
    userId: string,
  ) => Promise<{ data: FoodVariationRow[] | null; error: unknown | null }>;
  updateVariation: (
    id: string,
    values: Record<string, unknown>,
  ) => Promise<{ data: FoodVariationRow | null; error: unknown | null }>;
}>;

const GLOBAL_FOOD_SELECT =
  'id,canonical_name,brand,barcode,category,nutrition_basis,kcal_per_100_unit,protein_mg_per_100_unit,carbs_mg_per_100_unit,fat_mg_per_100_unit,quality_score,deleted_at';
const HOUSEHOLD_FOOD_SELECT =
  'id,name,household_id,nutrition_basis,kcal_per_100_unit,protein_mg_per_100_unit,carbs_mg_per_100_unit,fat_mg_per_100_unit,archived_at';
const PERSONAL_FOOD_SELECT =
  'id,name,category,nutrition_basis,kcal_per_100_unit,protein_mg_per_100_unit,carbs_mg_per_100_unit,fat_mg_per_100_unit,user_id,archived_at';
const VARIATION_SELECT =
  'id,canonical_food_id,created_by,household_id,scope,status,name,brand,barcode,category,nutrition_basis,kcal_per_100_unit,protein_mg_per_100_unit,carbs_mg_per_100_unit,fat_mg_per_100_unit,source_context,archived_at';
const MAX_SEARCH_RESULTS = 20;

const getRouteSegments = (request: Request): string[] => {
  const pathnameSegments = new URL(request.url).pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const foodsSegmentIndex = pathnameSegments.lastIndexOf('foods');

  return foodsSegmentIndex === -1 ? [] : pathnameSegments.slice(foodsSegmentIndex);
};

const getRoute = (request: Request): CatalogRoute | null => {
  const segments = getRouteSegments(request);

  if (request.method === 'GET' && segments.length === 2 && segments[1] === 'search') {
    return 'searchFoods';
  }

  if (request.method === 'POST' && segments.length === 2 && segments[1] === 'personal') {
    return 'createPersonalFood';
  }

  if (request.method === 'POST' && segments.length === 2 && segments[1] === 'variations') {
    return 'createFoodVariation';
  }

  if (request.method === 'PATCH' && segments.length === 3 && segments[1] === 'variations') {
    return 'updateFoodVariation';
  }

  if (
    request.method === 'POST' &&
    segments.length === 4 &&
    segments[1] === 'variations' &&
    segments[3] === 'promote'
  ) {
    return 'promoteFoodVariation';
  }

  return null;
};

const getVariationIdFromPath = (request: Request): string | null => {
  const segments = getRouteSegments(request);

  return segments[1] === 'variations' ? (segments[2] ?? null) : null;
};

const createTextMatcher = (request: SearchFoodsRequest): string | null => {
  const query = request.barcode ?? request.query;

  return query ? `%${query.replaceAll('%', '\\%').replaceAll('_', '\\_')}%` : null;
};

const applySearchFilters = (
  query: {
    eq: (column: string, value: string) => unknown;
    ilike: (column: string, value: string) => unknown;
    is: (column: string, value: null) => unknown;
    limit: (count: number) => unknown;
    or: (filters: string) => unknown;
  },
  request: SearchFoodsRequest,
  options: Readonly<{
    archiveColumn: 'archived_at' | 'deleted_at';
    barcodeColumn?: 'barcode';
    textColumns: readonly string[];
  }>,
): void => {
  query.is(options.archiveColumn, null);

  if (request.barcode) {
    query.eq(
      options.barcodeColumn ?? 'id',
      options.barcodeColumn ? request.barcode : crypto.randomUUID(),
    );
    query.limit(MAX_SEARCH_RESULTS);
    return;
  }

  const matcher = createTextMatcher(request);

  if (matcher && options.textColumns.length > 0) {
    query.or(options.textColumns.map((column) => `${column}.ilike.${matcher}`).join(','));
  }

  query.limit(MAX_SEARCH_RESULTS);
};

export const createCatalogService = (supabase: SupabaseClient): CatalogService => ({
  createGlobalSubmission: async (values) => {
    const result = await supabase
      .from('global_food_submissions')
      .insert(values)
      .select('id')
      .single<{ id: string }>();

    return result;
  },
  createPersonalFood: async (values) => {
    const result = await supabase
      .from('personal_food_items')
      .insert(values)
      .select(PERSONAL_FOOD_SELECT)
      .single<StoredFoodRow>();

    return result;
  },
  createVariation: async (values) => {
    const result = await supabase
      .from('food_variations')
      .insert(values)
      .select(VARIATION_SELECT)
      .single<FoodVariationRow>();

    return result;
  },
  getVariation: async (id) => {
    const result = await supabase
      .from('food_variations')
      .select(VARIATION_SELECT)
      .eq('id', id)
      .maybeSingle<FoodVariationRow>();

    return result;
  },
  searchGlobalFoods: async (request) => {
    const query = supabase.from('global_food_items').select(GLOBAL_FOOD_SELECT);
    applySearchFilters(query, request, {
      archiveColumn: 'deleted_at',
      barcodeColumn: 'barcode',
      textColumns: ['canonical_name', 'brand'],
    });
    const result = await query;

    return result as { data: StoredFoodRow[] | null; error: unknown | null };
  },
  searchHouseholdFoods: async (request) => {
    const query = supabase
      .from('household_food_items')
      .select(HOUSEHOLD_FOOD_SELECT)
      .eq('household_id', request.household_id);
    applySearchFilters(query, request, {
      archiveColumn: 'archived_at',
      textColumns: ['name'],
    });
    const result = await query;

    return result as { data: StoredFoodRow[] | null; error: unknown | null };
  },
  searchPersonalFoods: async (request, userId) => {
    const query = supabase
      .from('personal_food_items')
      .select(PERSONAL_FOOD_SELECT)
      .eq('user_id', userId);
    applySearchFilters(query, request, {
      archiveColumn: 'archived_at',
      textColumns: ['name'],
    });
    const result = await query;

    return result as { data: StoredFoodRow[] | null; error: unknown | null };
  },
  searchVariations: async (request, userId) => {
    const query = supabase.from('food_variations').select(VARIATION_SELECT);

    if (request.household_id) {
      query.or(`created_by.eq.${userId},household_id.eq.${request.household_id}`);
    } else {
      query.eq('created_by', userId);
    }

    applySearchFilters(query, request, {
      archiveColumn: 'archived_at',
      barcodeColumn: 'barcode',
      textColumns: ['name', 'brand'],
    });
    const result = await query;

    return result as { data: FoodVariationRow[] | null; error: unknown | null };
  },
  updateVariation: async (id, values) => {
    const result = await supabase
      .from('food_variations')
      .update({
        ...values,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(VARIATION_SELECT)
      .single<FoodVariationRow>();

    return result;
  },
});

const nutritionBasisForServingUnit = (unit: ServingBaseUnit): NutritionBasis | null => {
  if (unit === 'g') {
    return 'per_100g';
  }

  if (unit === 'ml') {
    return 'per_100ml';
  }

  return null;
};

const servingUnitForNutritionBasis = (basis: NutritionBasis): 'g' | 'ml' =>
  basis === 'per_100ml' ? 'ml' : 'g';

const perBaseToPer100 = (value: number): number => Math.round(value * 100);

const per100ToPerBase = (value: number | null): number | null =>
  value === null ? null : value / 100;

const mapStoredFood = (row: StoredFoodRow, sourceType: FoodSourceType): FoodSearchResult => ({
  brand: row.brand ?? null,
  carbs_mg_per_base: per100ToPerBase(row.carbs_mg_per_100_unit),
  category: row.category ?? null,
  fat_mg_per_base: per100ToPerBase(row.fat_mg_per_100_unit),
  id: row.id,
  kcal_per_base: per100ToPerBase(row.kcal_per_100_unit),
  name: row.canonical_name ?? row.name ?? '',
  protein_mg_per_base: per100ToPerBase(row.protein_mg_per_100_unit),
  serving_base_unit: servingUnitForNutritionBasis(row.nutrition_basis),
  source_type: sourceType,
  ...(row.status ? { status: row.status } : {}),
});

const scoreSearchResult = (result: FoodSearchResult, request: SearchFoodsRequest): number => {
  let score = 0;

  if (request.barcode) {
    score += 1000;
  }

  const query = request.query?.toLocaleLowerCase();

  if (query) {
    const name = result.name.toLocaleLowerCase();
    const brand = result.brand?.toLocaleLowerCase() ?? '';

    if (name === query) {
      score += 400;
    } else if (name.startsWith(query)) {
      score += 300;
    } else if (name.includes(query)) {
      score += 200;
    }

    if (brand.includes(query)) {
      score += 50;
    }
  }

  const sourceBoost: Readonly<Record<FoodSourceType, number>> = {
    global: 30,
    household: 20,
    personal: 10,
    variation: 0,
  };

  return score + sourceBoost[result.source_type];
};

const sortSearchResults = (
  results: FoodSearchResult[],
  request: SearchFoodsRequest,
): FoodSearchResult[] =>
  results
    .map((result, index) => ({
      index,
      result,
      score: scoreSearchResult(result, request),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ result }) => result)
    .slice(0, MAX_SEARCH_RESULTS);

const collectSearchRows = async <TRow>(
  promise: Promise<{ data: TRow[] | null; error: unknown | null }>,
): Promise<TRow[]> => {
  const { data, error } = await promise;

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const executeSearchFoods = async (
  service: CatalogService,
  context: AuthContext,
  request: SearchFoodsRequest,
): Promise<Response> => {
  try {
    const scope = request.scope ?? 'all';
    const includeGlobal = scope === 'all' || scope === 'global';
    const includePersonal = scope === 'all' || scope === 'personal';
    const includeHousehold = scope === 'all' || scope === 'household';
    const includeVariations = scope === 'all';
    const results: FoodSearchResult[] = [];

    if (includeGlobal) {
      const rows = await collectSearchRows(service.searchGlobalFoods(request));
      results.push(...rows.map((row) => mapStoredFood(row, 'global')));
    }

    if (includePersonal) {
      const rows = await collectSearchRows(service.searchPersonalFoods(request, context.user_id));
      results.push(...rows.map((row) => mapStoredFood(row, 'personal')));
    }

    if (includeHousehold && request.household_id) {
      const rows = await collectSearchRows(
        service.searchHouseholdFoods({
          ...request,
          household_id: request.household_id,
        }),
      );
      results.push(...rows.map((row) => mapStoredFood(row, 'household')));
    }

    if (includeVariations) {
      const rows = await collectSearchRows(service.searchVariations(request, context.user_id));
      results.push(...rows.map((row) => mapStoredFood(row, 'variation')));
    }

    return ok(
      {
        foods: sortSearchResults(results, request),
      },
      context.operation_id,
    );
  } catch {
    return err('internal_error', 'failed to search foods', 500, undefined, context.operation_id);
  }
};

export const executeCreatePersonalFood = async (
  service: CatalogService,
  context: AuthContext,
  request: CreatePersonalFoodRequest,
): Promise<Response> => {
  const nutritionBasis = nutritionBasisForServingUnit(request.serving_base_unit);

  if (!nutritionBasis) {
    return err(
      'validation_failed',
      'count-based personal foods are not supported yet',
      422,
      {
        issues: [
          {
            message: 'serving_base_unit count is not supported in Wave 3',
            path: ['serving_base_unit'],
          },
        ],
      },
      context.operation_id,
    );
  }

  const { data, error } = await service.createPersonalFood({
    category: request.category ?? null,
    carbs_mg_per_100_unit: perBaseToPer100(request.carbs_mg_per_base),
    fat_mg_per_100_unit: perBaseToPer100(request.fat_mg_per_base),
    kcal_per_100_unit: perBaseToPer100(request.kcal_per_base),
    linked_global_id: request.linked_global_id ?? null,
    name: request.name,
    notes: request.brand ? `brand: ${request.brand}` : null,
    nutrition_basis: nutritionBasis,
    protein_mg_per_100_unit: perBaseToPer100(request.protein_mg_per_base),
    user_id: context.user_id,
  });

  if (error || !data) {
    return err(
      'internal_error',
      'failed to create personal food',
      500,
      undefined,
      context.operation_id,
    );
  }

  return ok(
    {
      food: mapStoredFood(data, 'personal'),
    },
    context.operation_id,
    201,
  );
};

const nutritionPatchToStored = (nutrition?: NutritionFields): Record<string, unknown> => {
  if (!nutrition) {
    return {};
  }

  return {
    ...(nutrition.carbs_mg === undefined
      ? {}
      : { carbs_mg_per_100_unit: perBaseToPer100(nutrition.carbs_mg) }),
    ...(nutrition.fat_mg === undefined
      ? {}
      : { fat_mg_per_100_unit: perBaseToPer100(nutrition.fat_mg) }),
    ...(nutrition.kcal === undefined ? {} : { kcal_per_100_unit: perBaseToPer100(nutrition.kcal) }),
    ...(nutrition.protein_mg === undefined
      ? {}
      : { protein_mg_per_100_unit: perBaseToPer100(nutrition.protein_mg) }),
  };
};

const mapVariationResponse = (row: FoodVariationRow) => ({
  canonical_food_id: row.canonical_food_id,
  household_id: row.household_id,
  id: row.id,
  name: row.name,
  nutrition: {
    carbs_mg: per100ToPerBase(row.carbs_mg_per_100_unit),
    fat_mg: per100ToPerBase(row.fat_mg_per_100_unit),
    kcal: per100ToPerBase(row.kcal_per_100_unit),
    protein_mg: per100ToPerBase(row.protein_mg_per_100_unit),
  },
  scope: row.scope,
  source_context: row.source_context,
  source_type: 'variation' as const,
  status: row.status,
});

export const executeCreateFoodVariation = async (
  service: CatalogService,
  context: AuthContext,
  request: CreateFoodVariationRequest,
): Promise<Response> => {
  if (request.scope === 'household' && !request.household_id) {
    return err('bad_request', 'household_id required', 400, undefined, context.operation_id);
  }

  if (request.scope === 'personal' && request.household_id) {
    return err(
      'validation_failed',
      'personal variations must not include household_id',
      422,
      undefined,
      context.operation_id,
    );
  }

  const { data, error } = await service.createVariation({
    canonical_food_id: request.canonical_food_id ?? null,
    created_by: context.user_id,
    household_id: request.household_id ?? null,
    name: request.name,
    nutrition_basis: 'per_100g',
    scope: request.scope,
    source_context: request.source_context ?? null,
    status: 'unresolved',
    ...nutritionPatchToStored(request.nutrition),
  });

  if (error || !data) {
    return err(
      'internal_error',
      'failed to create food variation',
      500,
      undefined,
      context.operation_id,
    );
  }

  return ok(
    {
      variation: mapVariationResponse(data),
    },
    context.operation_id,
    201,
  );
};

const canTransitionVariation = (
  current: FoodVariationStatus,
  next: FoodVariationStatus,
): boolean => {
  if (current === next) {
    return true;
  }

  if (current === 'unresolved') {
    return next === 'confirmed';
  }

  if (current === 'confirmed') {
    return next === 'promoted';
  }

  return false;
};

export const executeUpdateFoodVariation = async (
  service: CatalogService,
  context: AuthContext,
  variation: FoodVariationRow,
  request: UpdateFoodVariationRequest,
): Promise<Response> => {
  if (request.status && !canTransitionVariation(variation.status, request.status)) {
    return err(
      'conflict',
      'invalid variation status transition',
      409,
      {
        from: variation.status,
        to: request.status,
      },
      context.operation_id,
    );
  }

  const { data, error } = await service.updateVariation(variation.id, {
    ...(request.name === undefined ? {} : { name: request.name }),
    ...(request.status === undefined ? {} : { status: request.status }),
    ...nutritionPatchToStored(request.nutrition),
  });

  if (error || !data) {
    return err(
      'internal_error',
      'failed to update food variation',
      500,
      undefined,
      context.operation_id,
    );
  }

  return ok(
    {
      variation: mapVariationResponse(data),
    },
    context.operation_id,
  );
};

export const executePromoteFoodVariation = async (
  service: CatalogService,
  context: AuthContext,
  variation: FoodVariationRow,
): Promise<Response> => {
  if (variation.status !== 'confirmed') {
    return err(
      'conflict',
      'only confirmed variations can be promoted',
      409,
      {
        status: variation.status,
      },
      context.operation_id,
    );
  }

  const submission = await service.createGlobalSubmission({
    proposed_name: variation.name,
    proposed_payload: {
      canonical_food_id: variation.canonical_food_id,
      carbs_mg_per_100_unit: variation.carbs_mg_per_100_unit,
      fat_mg_per_100_unit: variation.fat_mg_per_100_unit,
      household_id: variation.household_id,
      kcal_per_100_unit: variation.kcal_per_100_unit,
      name: variation.name,
      nutrition_basis: variation.nutrition_basis,
      protein_mg_per_100_unit: variation.protein_mg_per_100_unit,
      source_context: variation.source_context,
      variation_id: variation.id,
    },
    submitted_by: context.user_id,
  });

  if (submission.error || !submission.data) {
    return err(
      'internal_error',
      'failed to submit food variation for promotion',
      500,
      undefined,
      context.operation_id,
    );
  }

  const { data, error } = await service.updateVariation(variation.id, {
    status: 'promoted',
  });

  if (error || !data) {
    return err(
      'internal_error',
      'failed to mark food variation as promoted',
      500,
      undefined,
      context.operation_id,
    );
  }

  return ok(
    {
      submission_id: submission.data.id,
      variation: mapVariationResponse(data),
    },
    context.operation_id,
  );
};

const loadVariationForMutation = async (
  service: CatalogService,
  context: AuthContext,
  variationId: string | null,
): Promise<
  | Readonly<{
      ok: false;
      response: Response;
    }>
  | Readonly<{
      ok: true;
      variation: FoodVariationRow;
    }>
> => {
  if (!variationId) {
    return {
      ok: false,
      response: err('not_found', 'route not found', 404, undefined, context.operation_id),
    };
  }

  const { data, error } = await service.getVariation(variationId);

  if (error) {
    return {
      ok: false,
      response: err(
        'internal_error',
        'failed to load food variation',
        500,
        undefined,
        context.operation_id,
      ),
    };
  }

  if (!data || (data.scope === 'personal' && data.created_by !== context.user_id)) {
    return {
      ok: false,
      response: err('not_found', 'food variation not found', 404, undefined, context.operation_id),
    };
  }

  return {
    ok: true,
    variation: data,
  };
};

const withVariationHouseholdGuard = async (
  request: Request,
  context: AuthContext,
  variation: FoodVariationRow,
  handler: (request: Request, context: AuthContext | HouseholdContext) => Promise<Response>,
): Promise<Response> => {
  if (variation.scope !== 'household') {
    return await handler(request, context);
  }

  if (!variation.household_id) {
    return err(
      'internal_error',
      'household variation is missing household_id',
      500,
      undefined,
      context.operation_id,
    );
  }

  return await withHousehold({ householdIdFrom: () => variation.household_id })(
    async (guardedRequest, householdContext) => await handler(guardedRequest, householdContext),
  )(request, context);
};

export const handleAuthenticatedRequest = async (
  request: Request,
  context: AuthContext,
  service: CatalogService = createCatalogService(context.supabase),
): Promise<Response> => {
  const route = getRoute(request);

  if (!route) {
    return err('not_found', 'route not found', 404, undefined, context.operation_id);
  }

  if (route === 'searchFoods') {
    const result = await validate(searchFoodsSchema, request);

    if (!result.ok) {
      return result.response;
    }

    if (result.data.scope === 'household' && !result.data.household_id) {
      return err('bad_request', 'household_id required', 400, undefined, context.operation_id);
    }

    if (result.data.household_id) {
      return await withHousehold({ householdIdFrom: () => result.data.household_id })(
        async (_guardedRequest, householdContext) =>
          await executeSearchFoods(service, householdContext, result.data),
      )(request, context);
    }

    return await executeSearchFoods(service, context, result.data);
  }

  if (route === 'createPersonalFood') {
    const result = await validate(createPersonalFoodSchema, request);

    if (!result.ok) {
      return result.response;
    }

    return await executeCreatePersonalFood(service, context, result.data);
  }

  if (route === 'createFoodVariation') {
    const result = await validate(createFoodVariationSchema, request);

    if (!result.ok) {
      return result.response;
    }

    if (result.data.scope === 'household') {
      return await withHousehold({ householdIdFrom: 'body' })(
        async (_guardedRequest, householdContext) =>
          await executeCreateFoodVariation(service, householdContext, result.data),
      )(request, context);
    }

    return await executeCreateFoodVariation(service, context, result.data);
  }

  const variation = await loadVariationForMutation(
    service,
    context,
    getVariationIdFromPath(request),
  );

  if (!variation.ok) {
    return variation.response;
  }

  if (route === 'updateFoodVariation') {
    const result = await validate(updateFoodVariationSchema, request);

    if (!result.ok) {
      return result.response;
    }

    return await withVariationHouseholdGuard(
      request,
      context,
      variation.variation,
      async (_guardedRequest, guardedContext) =>
        await executeUpdateFoodVariation(service, guardedContext, variation.variation, result.data),
    );
  }

  return await withVariationHouseholdGuard(
    request,
    context,
    variation.variation,
    async (_guardedRequest, guardedContext) =>
      await executePromoteFoodVariation(service, guardedContext, variation.variation),
  );
};

export const handler = async (request: Request): Promise<Response> => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  return await withAuth(request, handleAuthenticatedRequest);
};

if (import.meta.main) {
  Deno.serve(handler);
}
