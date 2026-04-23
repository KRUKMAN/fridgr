import { err, handleOptions } from '../_shared/helpers/response.ts';
import { validate } from '../_shared/helpers/validate.ts';
import { extractOperationId, withAuth } from '../_shared/middleware/auth.ts';
import { withHousehold } from '../_shared/middleware/householdGuard.ts';
import { createDishSchema, serveSplitDishSchema } from '../_shared/types/schemas/dishes.ts';
import {
  createRecipeSchema,
  listRecipesSchema,
  updateRecipeSchema,
} from '../_shared/types/schemas/recipes.ts';

type RouteKey =
  | 'GET /households/:id/dishes/:dish'
  | 'GET /recipes'
  | 'PATCH /recipes/:id'
  | 'POST /households/:id/dishes'
  | 'POST /households/:id/dishes/:dish/serve-split'
  | 'POST /recipes'
  | 'POST /serve-splits/:portion/accept'
  | 'POST /serve-splits/:portion/decline';

const FUNCTION_SEGMENT = 'dishes';

const getSegments = (request: Request): string[] => {
  const segments = new URL(request.url).pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const functionIndex = segments.indexOf(FUNCTION_SEGMENT);

  if (functionIndex !== -1) {
    return segments.slice(functionIndex + 1);
  }

  if (segments[0] === 'api' && segments[1] === 'v1') {
    return segments.slice(2);
  }

  if (segments[0] === 'functions' && segments[1] === 'v1') {
    return segments.slice(2);
  }

  return segments;
};

const getRouteKey = (request: Request): RouteKey | null => {
  const segments = getSegments(request);

  if (
    request.method === 'POST' &&
    segments.length === 3 &&
    segments[0] === 'households' &&
    segments[2] === 'dishes'
  ) {
    return 'POST /households/:id/dishes';
  }

  if (
    request.method === 'GET' &&
    segments.length === 4 &&
    segments[0] === 'households' &&
    segments[2] === 'dishes'
  ) {
    return 'GET /households/:id/dishes/:dish';
  }

  if (
    request.method === 'POST' &&
    segments.length === 5 &&
    segments[0] === 'households' &&
    segments[2] === 'dishes' &&
    segments[4] === 'serve-split'
  ) {
    return 'POST /households/:id/dishes/:dish/serve-split';
  }

  if (
    request.method === 'POST' &&
    segments.length === 3 &&
    segments[0] === 'serve-splits' &&
    segments[2] === 'accept'
  ) {
    return 'POST /serve-splits/:portion/accept';
  }

  if (
    request.method === 'POST' &&
    segments.length === 3 &&
    segments[0] === 'serve-splits' &&
    segments[2] === 'decline'
  ) {
    return 'POST /serve-splits/:portion/decline';
  }

  if (request.method === 'GET' && segments.length === 1 && segments[0] === 'recipes') {
    return 'GET /recipes';
  }

  if (request.method === 'POST' && segments.length === 1 && segments[0] === 'recipes') {
    return 'POST /recipes';
  }

  if (request.method === 'PATCH' && segments.length === 2 && segments[0] === 'recipes') {
    return 'PATCH /recipes/:id';
  }

  return null;
};

const notImplemented = (operationId?: string): Response =>
  err('internal_error', 'not implemented', 501, undefined, operationId);

const notFound = (request: Request): Response =>
  err('not_found', 'route not found', 404, undefined, extractOperationId(request));

const householdPathHandler = withHousehold({ householdIdFrom: 'path' });
const householdBodyHandler = withHousehold({ householdIdFrom: 'body' });

const routeHandlers: Record<RouteKey, (request: Request) => Promise<Response>> = {
  'GET /households/:id/dishes/:dish': async (request: Request): Promise<Response> =>
    withAuth(
      request,
      householdPathHandler(async (_householdRequest, context): Promise<Response> =>
        notImplemented(context.operation_id),
      ),
    ),
  'GET /recipes': async (request: Request): Promise<Response> =>
    withAuth(request, async (authenticatedRequest, context): Promise<Response> => {
      const validation = await validate(listRecipesSchema, authenticatedRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  'PATCH /recipes/:id': async (request: Request): Promise<Response> =>
    withAuth(request, async (authenticatedRequest, context): Promise<Response> => {
      const validation = await validate(updateRecipeSchema, authenticatedRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  'POST /households/:id/dishes': async (request: Request): Promise<Response> =>
    withAuth(
      request,
      householdPathHandler(async (householdRequest, context): Promise<Response> => {
        const validation = await validate(createDishSchema, householdRequest);

        if (!validation.ok) {
          return validation.response;
        }

        return notImplemented(context.operation_id);
      }),
    ),
  'POST /households/:id/dishes/:dish/serve-split': async (request: Request): Promise<Response> =>
    withAuth(
      request,
      householdPathHandler(async (householdRequest, context): Promise<Response> => {
        const validation = await validate(serveSplitDishSchema, householdRequest);

        if (!validation.ok) {
          return validation.response;
        }

        return notImplemented(context.operation_id);
      }),
    ),
  'POST /recipes': async (request: Request): Promise<Response> =>
    withAuth(request, async (authenticatedRequest, context): Promise<Response> => {
      const validation = await validate(createRecipeSchema, authenticatedRequest);

      if (!validation.ok) {
        return validation.response;
      }

      const recipeData = validation.data;

      if (recipeData.owner_scope === 'household' && recipeData.household_id) {
        return householdBodyHandler(async (_householdRequest, householdContext): Promise<Response> =>
          notImplemented(householdContext.operation_id),
        )(authenticatedRequest, context);
      }

      return notImplemented(context.operation_id);
    }),
  'POST /serve-splits/:portion/accept': async (request: Request): Promise<Response> =>
    withAuth(request, async (_authenticatedRequest, context): Promise<Response> =>
      notImplemented(context.operation_id),
    ),
  'POST /serve-splits/:portion/decline': async (request: Request): Promise<Response> =>
    withAuth(request, async (_authenticatedRequest, context): Promise<Response> =>
      notImplemented(context.operation_id),
    ),
};

const handler = async (request: Request): Promise<Response> => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  const routeKey = getRouteKey(request);

  if (!routeKey) {
    return notFound(request);
  }

  return routeHandlers[routeKey](request);
};

Deno.serve(handler);
