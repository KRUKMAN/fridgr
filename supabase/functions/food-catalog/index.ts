import { err, handleOptions } from '../_shared/helpers/response.ts';
import { validate } from '../_shared/helpers/validate.ts';
import { withAuth, type AuthContext } from '../_shared/middleware/auth.ts';
import { withHousehold } from '../_shared/middleware/householdGuard.ts';
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

const notImplemented = (operationId?: string): Response =>
  err('internal_error', 'not implemented', 501, undefined, operationId);

const notFound = (operationId?: string): Response =>
  err('not_found', 'route not found', 404, undefined, operationId);

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

const bodyIncludesHouseholdId = async (request: Request): Promise<boolean> => {
  try {
    const payload = await request.clone().json();

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return false;
    }

    const householdId = Reflect.get(payload, 'household_id');

    return typeof householdId === 'string' && householdId.trim().length > 0;
  } catch {
    return false;
  }
};

const respondWithHouseholdGuardIfNeeded = async (
  request: Request,
  context: AuthContext,
): Promise<Response> => {
  if (!(await bodyIncludesHouseholdId(request))) {
    return notImplemented(context.operation_id);
  }

  return await withHousehold({ householdIdFrom: 'body' })(
    async (_request, householdContext): Promise<Response> =>
      notImplemented(householdContext.operation_id),
  )(request, context);
};

const handleAuthenticatedRequest = async (
  request: Request,
  context: AuthContext,
): Promise<Response> => {
  const route = getRoute(request);

  if (!route) {
    return notFound(context.operation_id);
  }

  if (route === 'searchFoods') {
    const result = await validate(searchFoodsSchema, request);

    if (!result.ok) {
      return result.response;
    }

    return notImplemented(context.operation_id);
  }

  if (route === 'createPersonalFood') {
    const result = await validate(createPersonalFoodSchema, request);

    if (!result.ok) {
      return result.response;
    }

    return notImplemented(context.operation_id);
  }

  if (route === 'createFoodVariation') {
    const result = await validate(createFoodVariationSchema, request);

    if (!result.ok) {
      return result.response;
    }

    if (result.data.household_id) {
      return await withHousehold({ householdIdFrom: 'body' })(
        async (_request, householdContext): Promise<Response> =>
          notImplemented(householdContext.operation_id),
      )(request, context);
    }

    return notImplemented(context.operation_id);
  }

  if (route === 'updateFoodVariation') {
    const result = await validate(updateFoodVariationSchema, request);

    if (!result.ok) {
      return result.response;
    }

    return notImplemented(context.operation_id);
  }

  return await respondWithHouseholdGuardIfNeeded(request, context);
};

Deno.serve(async (request: Request): Promise<Response> => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  return await withAuth(request, handleAuthenticatedRequest);
});
