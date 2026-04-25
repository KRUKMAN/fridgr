import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

import { emitEvent } from '../_shared/helpers/eventEmitter.ts';
import { err, handleOptions, ok } from '../_shared/helpers/response.ts';
import { validate } from '../_shared/helpers/validate.ts';
import { extractOperationId, withAuth } from '../_shared/middleware/auth.ts';
import { type HouseholdContext, withHousehold } from '../_shared/middleware/householdGuard.ts';
import type { PayloadFor } from '../_shared/types/events.ts';
import {
  consumeFridgeItemSchema,
  consumePrivateInventoryItemSchema,
  createFridgeItemSchema,
  createPrivateInventoryItemSchema,
  transferInventorySchema,
  updateFridgeItemSchema,
  wasteFridgeItemSchema,
} from '../_shared/types/schemas/inventory.ts';

type RouteKey =
  | 'GET /households/:id/fridge'
  | 'PATCH /households/:id/fridge/items/:item'
  | 'POST /households/:id/fridge/items'
  | 'POST /households/:id/fridge/items/:item/consume'
  | 'POST /households/:id/fridge/items/:item/waste'
  | 'POST /inventory/private/items'
  | 'POST /inventory/private/items/:item/consume'
  | 'POST /inventory/transfer';

type BaseUnit = 'count_each' | 'mass_mg' | 'volume_ml';
type NutritionBasis = 'per_100g' | 'per_100ml';
type FridgeSourceType = 'global' | 'household' | 'variation';

type CreateFridgeItemRequest = Readonly<{
  base_unit: BaseUnit;
  estimated_expiry?: string;
  quantity_base: number;
  source_id: string;
  source_type: FridgeSourceType;
  unit_display: string;
}>;

type UpdateFridgeItemRequest = Readonly<{
  estimated_expiry?: string;
  quantity_base?: number;
  unit_display?: string;
}>;

type ConsumeFridgeItemRequest = Readonly<{
  base_unit: BaseUnit;
  create_diary_entry?: boolean;
  quantity_base: number;
}>;

type WasteFridgeItemRequest = Readonly<{
  base_unit: BaseUnit;
  quantity_base: number;
  reason?: string;
}>;

type SourceSnapshot = Readonly<{
  category: string | null;
  carbs_mg_per_100_unit: number;
  density_mg_per_ml: number | null;
  fat_mg_per_100_unit: number;
  id: string;
  kcal_per_100_unit: number;
  name: string;
  nutrition_basis: NutritionBasis;
  protein_mg_per_100_unit: number;
}>;

type GlobalFoodSnapshotRow =
  & Omit<SourceSnapshot, 'name'>
  & Readonly<{
    canonical_name: string;
  }>;

type HouseholdFoodSnapshotRow =
  & Omit<SourceSnapshot, 'category'>
  & Readonly<{
    category?: string | null;
  }>;

type FridgeEventContext = HouseholdContext & Readonly<{ operation_id: string }>;

export type FridgeItemRow = Readonly<{
  added_by: string;
  archived_at: string | null;
  base_unit: BaseUnit;
  created_at: string;
  estimated_expiry: string | null;
  food_variation_id: string | null;
  global_food_id: string | null;
  household_food_item_id: string | null;
  household_id: string;
  id: string;
  personal_food_id: string | null;
  quantity_base: number;
  snapshot_carbs_mg_per_100_unit: number;
  snapshot_category: string | null;
  snapshot_density_mg_per_ml: number | null;
  snapshot_fat_mg_per_100_unit: number;
  snapshot_food_name: string;
  snapshot_kcal_per_100_unit: number;
  snapshot_nutrition_basis: NutritionBasis;
  snapshot_protein_mg_per_100_unit: number;
  unit_display: string;
  updated_at: string;
  version: number;
}>;

export type FridgeService = Readonly<{
  createFridgeItem: (
    values: Record<string, unknown>,
  ) => Promise<{ data: FridgeItemRow | null; error: unknown | null }>;
  emitFridgeEvent: <TType extends 'FridgeItemAdded' | 'FridgeItemConsumed' | 'FridgeItemWasted'>(
    type: TType,
    payload: PayloadFor<TType>,
    context: FridgeEventContext,
  ) => Promise<string>;
  getFridgeItem: (
    householdId: string,
    itemId: string,
  ) => Promise<{ data: FridgeItemRow | null; error: unknown | null }>;
  getGlobalFoodSnapshot: (
    sourceId: string,
  ) => Promise<{ data: SourceSnapshot | null; error: unknown | null }>;
  getHouseholdFoodSnapshot: (
    householdId: string,
    sourceId: string,
  ) => Promise<{ data: SourceSnapshot | null; error: unknown | null }>;
  getVariationSnapshot: (
    householdId: string,
    sourceId: string,
  ) => Promise<{ data: SourceSnapshot | null; error: unknown | null }>;
  listFridgeItems: (
    householdId: string,
  ) => Promise<{ data: FridgeItemRow[] | null; error: unknown | null }>;
  updateFridgeItem: (
    householdId: string,
    itemId: string,
    values: Record<string, unknown>,
  ) => Promise<{ data: FridgeItemRow | null; error: unknown | null }>;
}>;

const FUNCTION_SEGMENT = 'fridge-items';
const FRIDGE_ITEM_SELECT =
  'id,household_id,global_food_id,personal_food_id,household_food_item_id,food_variation_id,snapshot_food_name,snapshot_nutrition_basis,snapshot_kcal_per_100_unit,snapshot_protein_mg_per_100_unit,snapshot_carbs_mg_per_100_unit,snapshot_fat_mg_per_100_unit,snapshot_category,snapshot_density_mg_per_ml,quantity_base,base_unit,unit_display,estimated_expiry,version,added_by,created_at,updated_at,archived_at';
const GLOBAL_FOOD_SNAPSHOT_SELECT =
  'id,canonical_name,category,nutrition_basis,density_mg_per_ml,kcal_per_100_unit,protein_mg_per_100_unit,carbs_mg_per_100_unit,fat_mg_per_100_unit';
const HOUSEHOLD_FOOD_SNAPSHOT_SELECT =
  'id,name,nutrition_basis,density_mg_per_ml,kcal_per_100_unit,protein_mg_per_100_unit,carbs_mg_per_100_unit,fat_mg_per_100_unit';
const VARIATION_SNAPSHOT_SELECT =
  'id,name,category,nutrition_basis,density_mg_per_ml,kcal_per_100_unit,protein_mg_per_100_unit,carbs_mg_per_100_unit,fat_mg_per_100_unit';

const getRouteSegments = (request: Request): string[] => {
  const segments = new URL(request.url).pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const functionIndex = segments.lastIndexOf(FUNCTION_SEGMENT);

  return functionIndex === -1 ? [] : segments.slice(functionIndex + 1);
};

const getRoutePath = (request: Request): string => {
  const segments = getRouteSegments(request);

  return `/${segments.join('/')}`;
};

const getRouteKey = (request: Request): RouteKey | null => {
  const routePath = getRoutePath(request);

  if (request.method === 'GET' && /^\/households\/[^/]+\/fridge$/.test(routePath)) {
    return 'GET /households/:id/fridge';
  }

  if (request.method === 'POST' && /^\/households\/[^/]+\/fridge\/items$/.test(routePath)) {
    return 'POST /households/:id/fridge/items';
  }

  if (request.method === 'PATCH' && /^\/households\/[^/]+\/fridge\/items\/[^/]+$/.test(routePath)) {
    return 'PATCH /households/:id/fridge/items/:item';
  }

  if (
    request.method === 'POST' &&
    /^\/households\/[^/]+\/fridge\/items\/[^/]+\/consume$/.test(routePath)
  ) {
    return 'POST /households/:id/fridge/items/:item/consume';
  }

  if (
    request.method === 'POST' &&
    /^\/households\/[^/]+\/fridge\/items\/[^/]+\/waste$/.test(routePath)
  ) {
    return 'POST /households/:id/fridge/items/:item/waste';
  }

  if (request.method === 'POST' && routePath === '/inventory/private/items') {
    return 'POST /inventory/private/items';
  }

  if (
    request.method === 'POST' &&
    /^\/inventory\/private\/items\/[^/]+\/consume$/.test(routePath)
  ) {
    return 'POST /inventory/private/items/:item/consume';
  }

  if (request.method === 'POST' && routePath === '/inventory/transfer') {
    return 'POST /inventory/transfer';
  }

  return null;
};

const getPathParam = (request: Request, index: number): string | null =>
  getRouteSegments(request)[index] ?? null;

const getItemIdFromPath = (request: Request): string | null => getPathParam(request, 4);

const notImplemented = (operationId?: string): Response =>
  err('internal_error', 'not implemented', 501, undefined, operationId);

const toGlobalSnapshot = (row: GlobalFoodSnapshotRow): SourceSnapshot => ({
  ...row,
  name: row.canonical_name,
});

const toHouseholdSnapshot = (row: HouseholdFoodSnapshotRow): SourceSnapshot => ({
  ...row,
  category: row.category ?? null,
});

export const createFridgeService = (supabase: SupabaseClient): FridgeService => ({
  createFridgeItem: async (values) => {
    const result = await supabase
      .from('fridge_items')
      .insert(values)
      .select(FRIDGE_ITEM_SELECT)
      .single<FridgeItemRow>();

    return result;
  },
  emitFridgeEvent: async (type, payload, context) => await emitEvent(type, payload, context),
  getFridgeItem: async (householdId, itemId) => {
    const result = await supabase
      .from('fridge_items')
      .select(FRIDGE_ITEM_SELECT)
      .eq('household_id', householdId)
      .eq('id', itemId)
      .is('archived_at', null)
      .maybeSingle<FridgeItemRow>();

    return result;
  },
  getGlobalFoodSnapshot: async (sourceId) => {
    const result = await supabase
      .from('global_food_items')
      .select(GLOBAL_FOOD_SNAPSHOT_SELECT)
      .eq('id', sourceId)
      .is('deleted_at', null)
      .maybeSingle<GlobalFoodSnapshotRow>();

    return {
      data: result.data ? toGlobalSnapshot(result.data) : null,
      error: result.error,
    };
  },
  getHouseholdFoodSnapshot: async (householdId, sourceId) => {
    const result = await supabase
      .from('household_food_items')
      .select(HOUSEHOLD_FOOD_SNAPSHOT_SELECT)
      .eq('household_id', householdId)
      .eq('id', sourceId)
      .is('archived_at', null)
      .maybeSingle<HouseholdFoodSnapshotRow>();

    return {
      data: result.data ? toHouseholdSnapshot(result.data) : null,
      error: result.error,
    };
  },
  getVariationSnapshot: async (householdId, sourceId) => {
    const result = await supabase
      .from('food_variations')
      .select(VARIATION_SNAPSHOT_SELECT)
      .eq('household_id', householdId)
      .eq('id', sourceId)
      .eq('scope', 'household')
      .is('archived_at', null)
      .maybeSingle<SourceSnapshot>();

    return result;
  },
  listFridgeItems: async (householdId) => {
    const result = await supabase
      .from('fridge_items')
      .select(FRIDGE_ITEM_SELECT)
      .eq('household_id', householdId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    return result as { data: FridgeItemRow[] | null; error: unknown | null };
  },
  updateFridgeItem: async (householdId, itemId, values) => {
    const result = await supabase
      .from('fridge_items')
      .update({
        ...values,
        updated_at: new Date().toISOString(),
      })
      .eq('household_id', householdId)
      .eq('id', itemId)
      .is('archived_at', null)
      .select(FRIDGE_ITEM_SELECT)
      .single<FridgeItemRow>();

    return result;
  },
});

const sourceColumnsForType = (
  sourceType: FridgeSourceType,
  sourceId: string,
): Record<string, string | null> => ({
  food_variation_id: sourceType === 'variation' ? sourceId : null,
  global_food_id: sourceType === 'global' ? sourceId : null,
  household_food_item_id: sourceType === 'household' ? sourceId : null,
  personal_food_id: null,
});

const mapFridgeItem = (row: FridgeItemRow) => ({
  added_by: row.added_by,
  archived_at: row.archived_at,
  base_unit: row.base_unit,
  created_at: row.created_at,
  estimated_expiry: row.estimated_expiry,
  food_variation_id: row.food_variation_id,
  global_food_id: row.global_food_id,
  household_food_item_id: row.household_food_item_id,
  household_id: row.household_id,
  id: row.id,
  quantity_base: row.quantity_base,
  snapshot: {
    carbs_mg_per_100_unit: row.snapshot_carbs_mg_per_100_unit,
    category: row.snapshot_category,
    density_mg_per_ml: row.snapshot_density_mg_per_ml,
    fat_mg_per_100_unit: row.snapshot_fat_mg_per_100_unit,
    food_name: row.snapshot_food_name,
    kcal_per_100_unit: row.snapshot_kcal_per_100_unit,
    nutrition_basis: row.snapshot_nutrition_basis,
    protein_mg_per_100_unit: row.snapshot_protein_mg_per_100_unit,
  },
  unit_display: row.unit_display,
  updated_at: row.updated_at,
  version: row.version,
});

const getFridgeEventContext = (
  context: HouseholdContext,
): Readonly<
  | {
    context: FridgeEventContext;
    ok: true;
  }
  | {
    ok: false;
    response: Response;
  }
> => {
  if (!context.operation_id) {
    return {
      ok: false,
      response: err(
        'bad_request',
        'Idempotency-Key header is required for fridge mutations',
        400,
        undefined,
        context.operation_id,
      ),
    };
  }

  return {
    context: {
      ...context,
      operation_id: context.operation_id,
    },
    ok: true,
  };
};

const getSourceSnapshot = async (
  service: FridgeService,
  context: HouseholdContext,
  request: CreateFridgeItemRequest,
): Promise<
  | Readonly<{
    ok: false;
    response: Response;
  }>
  | Readonly<{
    ok: true;
    snapshot: SourceSnapshot;
  }>
> => {
  const result = request.source_type === 'global'
    ? await service.getGlobalFoodSnapshot(request.source_id)
    : request.source_type === 'household'
    ? await service.getHouseholdFoodSnapshot(context.household_id, request.source_id)
    : await service.getVariationSnapshot(context.household_id, request.source_id);

  if (result.error) {
    return {
      ok: false,
      response: err(
        'internal_error',
        'failed to load fridge item source',
        500,
        undefined,
        context.operation_id,
      ),
    };
  }

  if (!result.data) {
    return {
      ok: false,
      response: err(
        'not_found',
        'fridge item source not found',
        404,
        undefined,
        context.operation_id,
      ),
    };
  }

  return {
    ok: true,
    snapshot: result.data,
  };
};

const loadMutableFridgeItem = async (
  service: FridgeService,
  context: HouseholdContext,
  itemId: string | null,
): Promise<
  | Readonly<{
    item: FridgeItemRow;
    ok: true;
  }>
  | Readonly<{
    ok: false;
    response: Response;
  }>
> => {
  if (!itemId) {
    return {
      ok: false,
      response: err('not_found', 'route not found', 404, undefined, context.operation_id),
    };
  }

  const { data, error } = await service.getFridgeItem(context.household_id, itemId);

  if (error) {
    return {
      ok: false,
      response: err(
        'internal_error',
        'failed to load fridge item',
        500,
        undefined,
        context.operation_id,
      ),
    };
  }

  if (!data) {
    return {
      ok: false,
      response: err('not_found', 'fridge item not found', 404, undefined, context.operation_id),
    };
  }

  return {
    item: data,
    ok: true,
  };
};

const ensureCanMutateItem = (item: FridgeItemRow, context: HouseholdContext): Response | null =>
  item.added_by === context.user_id ? null : err(
    'forbidden',
    'only the member who added this fridge item can change it',
    403,
    undefined,
    context.operation_id,
  );

const updateQuantityOrArchive = async (
  service: FridgeService,
  context: HouseholdContext,
  item: FridgeItemRow,
  remainingQuantity: number,
): Promise<{ data: FridgeItemRow | null; error: unknown | null }> =>
  await service.updateFridgeItem(
    context.household_id,
    item.id,
    remainingQuantity === 0
      ? {
        archived_at: new Date().toISOString(),
      }
      : {
        quantity_base: remainingQuantity,
        version: item.version + 1,
      },
  );

export const executeListFridgeItems = async (
  service: FridgeService,
  context: HouseholdContext,
): Promise<Response> => {
  const { data, error } = await service.listFridgeItems(context.household_id);

  if (error) {
    return err(
      'internal_error',
      'failed to list fridge items',
      500,
      undefined,
      context.operation_id,
    );
  }

  return ok(
    {
      items: (data ?? []).map(mapFridgeItem),
    },
    context.operation_id,
  );
};

export const executeCreateFridgeItem = async (
  service: FridgeService,
  context: HouseholdContext,
  request: CreateFridgeItemRequest,
): Promise<Response> => {
  const eventContext = getFridgeEventContext(context);

  if (!eventContext.ok) {
    return eventContext.response;
  }

  const snapshotResult = await getSourceSnapshot(service, context, request);

  if (!snapshotResult.ok) {
    return snapshotResult.response;
  }

  const { snapshot } = snapshotResult;
  const { data, error } = await service.createFridgeItem({
    ...sourceColumnsForType(request.source_type, request.source_id),
    added_by: context.user_id,
    base_unit: request.base_unit,
    estimated_expiry: request.estimated_expiry ?? null,
    household_id: context.household_id,
    quantity_base: request.quantity_base,
    snapshot_carbs_mg_per_100_unit: snapshot.carbs_mg_per_100_unit,
    snapshot_category: snapshot.category,
    snapshot_density_mg_per_ml: snapshot.density_mg_per_ml,
    snapshot_fat_mg_per_100_unit: snapshot.fat_mg_per_100_unit,
    snapshot_food_name: snapshot.name,
    snapshot_kcal_per_100_unit: snapshot.kcal_per_100_unit,
    snapshot_nutrition_basis: snapshot.nutrition_basis,
    snapshot_protein_mg_per_100_unit: snapshot.protein_mg_per_100_unit,
    unit_display: request.unit_display,
  });

  if (error || !data) {
    return err(
      'internal_error',
      'failed to create fridge item',
      500,
      undefined,
      context.operation_id,
    );
  }

  await service.emitFridgeEvent(
    'FridgeItemAdded',
    {
      base_unit: data.base_unit,
      fridge_item_id: data.id,
      quantity_base: data.quantity_base,
      snapshot_food_name: data.snapshot_food_name,
      source_type: 'manual_add',
    },
    eventContext.context,
  );

  return ok(
    {
      item: mapFridgeItem(data),
    },
    context.operation_id,
    201,
  );
};

export const executeUpdateFridgeItem = async (
  service: FridgeService,
  context: HouseholdContext,
  itemId: string | null,
  request: UpdateFridgeItemRequest,
): Promise<Response> => {
  const eventContext = getFridgeEventContext(context);

  if (!eventContext.ok) {
    return eventContext.response;
  }

  const itemResult = await loadMutableFridgeItem(service, context, itemId);

  if (!itemResult.ok) {
    return itemResult.response;
  }

  const permissionError = ensureCanMutateItem(itemResult.item, context);

  if (permissionError) {
    return permissionError;
  }

  const { data, error } = await service.updateFridgeItem(context.household_id, itemResult.item.id, {
    ...(request.estimated_expiry === undefined
      ? {}
      : { estimated_expiry: request.estimated_expiry }),
    ...(request.quantity_base === undefined ? {} : { quantity_base: request.quantity_base }),
    ...(request.unit_display === undefined ? {} : { unit_display: request.unit_display }),
    version: itemResult.item.version + 1,
  });

  if (error || !data) {
    return err(
      'internal_error',
      'failed to update fridge item',
      500,
      undefined,
      context.operation_id,
    );
  }

  return ok(
    {
      item: mapFridgeItem(data),
    },
    context.operation_id,
  );
};

export const executeConsumeFridgeItem = async (
  service: FridgeService,
  context: HouseholdContext,
  itemId: string | null,
  request: ConsumeFridgeItemRequest,
): Promise<Response> => {
  const eventContext = getFridgeEventContext(context);

  if (!eventContext.ok) {
    return eventContext.response;
  }

  const itemResult = await loadMutableFridgeItem(service, context, itemId);

  if (!itemResult.ok) {
    return itemResult.response;
  }

  const { item } = itemResult;
  const permissionError = ensureCanMutateItem(item, context);

  if (permissionError) {
    return permissionError;
  }

  if (item.base_unit !== request.base_unit) {
    return err(
      'conflict',
      'base_unit does not match fridge item',
      409,
      undefined,
      context.operation_id,
    );
  }

  if (request.quantity_base > item.quantity_base) {
    return err(
      'conflict',
      'cannot consume more than the available quantity',
      409,
      {
        available_quantity: item.quantity_base,
      },
      context.operation_id,
    );
  }

  const remainingQuantity = item.quantity_base - request.quantity_base;
  const { data, error } = await updateQuantityOrArchive(service, context, item, remainingQuantity);

  if (error || !data) {
    return err(
      'internal_error',
      'failed to consume fridge item',
      500,
      undefined,
      context.operation_id,
    );
  }

  await service.emitFridgeEvent(
    'FridgeItemConsumed',
    {
      base_unit: item.base_unit,
      fridge_item_id: item.id,
      quantity_consumed: request.quantity_base,
      remaining_quantity: remainingQuantity,
    },
    eventContext.context,
  );

  return ok(
    {
      item: mapFridgeItem(data),
      remaining_quantity: remainingQuantity,
    },
    context.operation_id,
  );
};

export const executeWasteFridgeItem = async (
  service: FridgeService,
  context: HouseholdContext,
  itemId: string | null,
  request: WasteFridgeItemRequest,
): Promise<Response> => {
  const eventContext = getFridgeEventContext(context);

  if (!eventContext.ok) {
    return eventContext.response;
  }

  const itemResult = await loadMutableFridgeItem(service, context, itemId);

  if (!itemResult.ok) {
    return itemResult.response;
  }

  const { item } = itemResult;
  const permissionError = ensureCanMutateItem(item, context);

  if (permissionError) {
    return permissionError;
  }

  if (item.base_unit !== request.base_unit) {
    return err(
      'conflict',
      'base_unit does not match fridge item',
      409,
      undefined,
      context.operation_id,
    );
  }

  if (request.quantity_base > item.quantity_base) {
    return err(
      'conflict',
      'cannot waste more than the available quantity',
      409,
      {
        available_quantity: item.quantity_base,
      },
      context.operation_id,
    );
  }

  const remainingQuantity = item.quantity_base - request.quantity_base;
  const { data, error } = await updateQuantityOrArchive(service, context, item, remainingQuantity);

  if (error || !data) {
    return err(
      'internal_error',
      'failed to waste fridge item',
      500,
      undefined,
      context.operation_id,
    );
  }

  await service.emitFridgeEvent(
    'FridgeItemWasted',
    {
      base_unit: item.base_unit,
      fridge_item_id: item.id,
      quantity_wasted: request.quantity_base,
      ...(request.reason ? { reason: request.reason } : {}),
      remaining_quantity: remainingQuantity,
    },
    eventContext.context,
  );

  return ok(
    {
      item: mapFridgeItem(data),
      remaining_quantity: remainingQuantity,
    },
    context.operation_id,
  );
};

const pathScopedHandler = withHousehold({
  householdIdFrom: 'path',
});

const bodyScopedHandler = withHousehold({
  householdIdFrom: 'body',
});

const createFridgeRouteHandler = (
  handler: (
    request: Request,
    context: HouseholdContext,
    service: FridgeService,
  ) => Promise<Response>,
) =>
(request: Request): Promise<Response> =>
  withAuth(
    request,
    pathScopedHandler(
      async (householdRequest, context): Promise<Response> =>
        await handler(householdRequest, context, createFridgeService(context.supabase)),
    ),
  );

const handleGetFridgeRoute = createFridgeRouteHandler(
  async (_request, context, service) => await executeListFridgeItems(service, context),
);

const handleCreateFridgeItemRoute = createFridgeRouteHandler(async (request, context, service) => {
  const validation = await validate(createFridgeItemSchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return await executeCreateFridgeItem(service, context, validation.data);
});

const handleUpdateFridgeItemRoute = createFridgeRouteHandler(async (request, context, service) => {
  const validation = await validate(updateFridgeItemSchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return await executeUpdateFridgeItem(
    service,
    context,
    getItemIdFromPath(request),
    validation.data,
  );
});

const handleConsumeFridgeItemRoute = createFridgeRouteHandler(async (request, context, service) => {
  const validation = await validate(consumeFridgeItemSchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return await executeConsumeFridgeItem(
    service,
    context,
    getItemIdFromPath(request),
    validation.data,
  );
});

const handleWasteFridgeItemRoute = createFridgeRouteHandler(async (request, context, service) => {
  const validation = await validate(wasteFridgeItemSchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return await executeWasteFridgeItem(
    service,
    context,
    getItemIdFromPath(request),
    validation.data,
  );
});

const handleCreatePrivateInventoryItemRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    bodyScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(createPrivateInventoryItemSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

const handleConsumePrivateInventoryItemRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    bodyScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(consumePrivateInventoryItemSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

const handleTransferInventoryRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    bodyScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(transferInventorySchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

const routeHandlers: Readonly<Record<RouteKey, (request: Request) => Promise<Response>>> = {
  'GET /households/:id/fridge': handleGetFridgeRoute,
  'PATCH /households/:id/fridge/items/:item': handleUpdateFridgeItemRoute,
  'POST /households/:id/fridge/items': handleCreateFridgeItemRoute,
  'POST /households/:id/fridge/items/:item/consume': handleConsumeFridgeItemRoute,
  'POST /households/:id/fridge/items/:item/waste': handleWasteFridgeItemRoute,
  'POST /inventory/private/items': handleCreatePrivateInventoryItemRoute,
  'POST /inventory/private/items/:item/consume': handleConsumePrivateInventoryItemRoute,
  'POST /inventory/transfer': handleTransferInventoryRoute,
};

export const handler = async (request: Request): Promise<Response> => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  const routeKey = getRouteKey(request);

  if (!routeKey) {
    return err('not_found', 'route not found', 404, undefined, extractOperationId(request));
  }

  return routeHandlers[routeKey](request);
};

if (import.meta.main) {
  Deno.serve(handler);
}
