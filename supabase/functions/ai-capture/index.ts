import { err, handleOptions } from '../_shared/helpers/response.ts';
import { validate } from '../_shared/helpers/validate.ts';
import { withAuth } from '../_shared/middleware/auth.ts';
import { withHousehold } from '../_shared/middleware/householdGuard.ts';
import {
  captureReceiptSchema,
  captureVoiceSchema,
  confirmCaptureSchema,
} from '../_shared/types/schemas/capture.ts';

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

type RouteKey = 'POST /capture/confirm' | 'POST /capture/receipt' | 'POST /capture/voice';

const FUNCTION_SEGMENT = 'ai-capture';

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

  if (request.method === 'POST' && routePath === '/capture/receipt') {
    return 'POST /capture/receipt';
  }

  if (request.method === 'POST' && routePath === '/capture/confirm') {
    return 'POST /capture/confirm';
  }

  if (request.method === 'POST' && routePath === '/capture/voice') {
    return 'POST /capture/voice';
  }

  return null;
};

const notImplemented = (operationId?: string): Response =>
  err('internal_error', 'not implemented', 501, undefined, operationId);

const householdScopedHandler = withHousehold({
  householdIdFrom: 'body',
});

const handleReceiptRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    householdScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(captureReceiptSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

const handleConfirmRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    householdScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(confirmCaptureSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

const handleVoiceRoute = (request: Request): Promise<Response> =>
  withAuth(
    request,
    householdScopedHandler(async (householdRequest, context): Promise<Response> => {
      const validation = await validate(captureVoiceSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      return notImplemented(context.operation_id);
    }),
  );

const routeHandlers: Readonly<Record<RouteKey, (request: Request) => Promise<Response>>> = {
  'POST /capture/confirm': handleConfirmRoute,
  'POST /capture/receipt': handleReceiptRoute,
  'POST /capture/voice': handleVoiceRoute,
};

const handler = async (request: Request): Promise<Response> => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  const routeKey = getRouteKey(request);

  if (!routeKey) {
    const operationId =
      request.headers.get('Idempotency-Key')?.trim() ||
      request.headers.get('operation_id')?.trim() ||
      undefined;

    return err('not_found', 'route not found', 404, undefined, operationId);
  }

  return routeHandlers[routeKey](request);
};

Deno.serve(handler);
