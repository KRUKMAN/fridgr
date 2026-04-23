import { err, handleOptions } from '../_shared/helpers/response.ts';
import { validate } from '../_shared/helpers/validate.ts';
import { extractOperationId, withAuth } from '../_shared/middleware/auth.ts';
import { withHousehold } from '../_shared/middleware/householdGuard.ts';
import {
  correctDiaryEntrySchema,
  createDiaryEntrySchema,
  diarySummaryQuerySchema,
} from '../_shared/types/schemas/diary.ts';

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const DIARY_SEGMENT = 'diary';

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

const notImplemented = (operationId?: string): Response =>
  err('internal_error', 'not implemented', 501, undefined, operationId);

const isCreateDiaryEntryRoute = (request: Request, segments: readonly string[]): boolean =>
  request.method === 'POST' && segments.length === 1 && segments[0] === 'entries';

const isCorrectDiaryEntryRoute = (request: Request, segments: readonly string[]): boolean =>
  request.method === 'POST' &&
  segments.length === 3 &&
  segments[0] === 'entries' &&
  (segments[1]?.length ?? 0) > 0 &&
  segments[2] === 'correct';

const isDiarySummaryRoute = (request: Request, segments: readonly string[]): boolean =>
  request.method === 'GET' && segments.length === 1 && segments[0] === 'summary';

const createDiaryEntryHandler = withHousehold({ householdIdFrom: 'body' })(
  async (request, context): Promise<Response> => {
    const validation = await validate(createDiaryEntrySchema, request);

    if (!validation.ok) {
      return validation.response;
    }

    return notImplemented(context.operation_id);
  },
);

const correctDiaryEntryHandler = async (request: Request, operationId?: string): Promise<Response> => {
  const validation = await validate(correctDiaryEntrySchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return notImplemented(operationId);
};

const diarySummaryHandler = async (request: Request, operationId?: string): Promise<Response> => {
  const validation = await validate(diarySummaryQuerySchema, request);

  if (!validation.ok) {
    return validation.response;
  }

  return notImplemented(operationId);
};

const handler = async (request: Request): Promise<Response> => {
  const preflightResponse = handleOptions(request);

  if (preflightResponse) {
    return preflightResponse;
  }

  const routeSegments = getRouteSegments(request);

  if (isCreateDiaryEntryRoute(request, routeSegments)) {
    return withAuth(request, createDiaryEntryHandler);
  }

  if (isCorrectDiaryEntryRoute(request, routeSegments)) {
    return withAuth(request, async (authenticatedRequest, context) =>
      correctDiaryEntryHandler(authenticatedRequest, context.operation_id),
    );
  }

  if (isDiarySummaryRoute(request, routeSegments)) {
    return withAuth(request, async (authenticatedRequest, context) =>
      diarySummaryHandler(authenticatedRequest, context.operation_id),
    );
  }

  return notFound(request);
};

Deno.serve(handler);
