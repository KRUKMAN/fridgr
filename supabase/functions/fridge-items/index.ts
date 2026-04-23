import { err, handleOptions } from '../_shared/helpers/response.ts';
import { validate } from '../_shared/helpers/validate.ts';
import { withAuth } from '../_shared/middleware/auth.ts';
import { withHousehold } from '../_shared/middleware/householdGuard.ts';
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

const FUNCTION_SEGMENT = 'fridge-items';

const getOperationId = (request: Request): string | undefined =>
  request.headers.get('Idempotency-Key')?.trim() ||
  request.headers.get('operation_id')?.trim() ||
  undefined;

const getRoutePath = (request: Request): string => {
  const segments = new URL(request.url).pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const functionIndex = segments.lastIndexOf(FUNCTION_SEGMENT);

  if (functionIndex === -1) {
    return '/';
  }

  return `/${segments.slice(functionIndex + 1).join('/')}`;
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

  if (request.method === 'POST' && /^\/inventory\/private\/items\/[^/]+\/consume$/.test(routePath)) {
    return 'POST /inventory/private/items/:item/consume';
  }

  if (request.method === 'POST' && routePath === '/inventory/transfer') {
    return 'POST /inventory/transfer';
  }

  return null;
};

const notImplemented = (operationId?: string): Response =>
  err('internal_error', 'not implemented', 501, undefined, operationId);

const pathScopedHandler = withHousehold({
  householdIdFrom: 'path',
});

const bodyScopedHandler = withHousehold({
  householdIdFrom: 'body',
});

const handleGetFridgeRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    pathScopedHandler(async (_householdRequest, context): Promise<Response> =>
      notImplemented(context.operation_id)
    ),
  );

const handleCreateFridgeItemRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    pathScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(createFridgeItemSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

const handleUpdateFridgeItemRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    pathScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(updateFridgeItemSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

const handleConsumeFridgeItemRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    pathScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(consumeFridgeItemSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

const handleWasteFridgeItemRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    pathScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(wasteFridgeItemSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

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

const handler = async (request: Request): Promise<Response> => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  const routeKey = getRouteKey(request);

  if (!routeKey) {
    return err('not_found', 'route not found', 404, undefined, getOperationId(request));
  }

  return routeHandlers[routeKey](request);
};

Deno.serve(handler);
