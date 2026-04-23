import { err, handleOptions } from '../_shared/helpers/response.ts';
import { validate } from '../_shared/helpers/validate.ts';
import { withAuth, type AuthContext, extractOperationId } from '../_shared/middleware/auth.ts';
import {
  withHousehold,
  type HouseholdContext,
} from '../_shared/middleware/householdGuard.ts';
import { createHouseholdSchema } from '../_shared/types/schemas/identity.ts';

type RouteSegments = readonly string[];

const normalizePathSegments = (request: Request): RouteSegments => {
  const segments = new URL(request.url).pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  const householdsIndex = segments.indexOf('households');

  if (householdsIndex !== -1) {
    return segments.slice(householdsIndex + 1);
  }

  if (segments[0] === 'functions' && segments[1] === 'v1' && segments[2] === 'households') {
    return segments.slice(3);
  }

  if (segments[0] === 'api' && segments[1] === 'v1') {
    return segments.slice(2);
  }

  return segments;
};

const isCreateHouseholdRoute = (request: Request, segments: RouteSegments): boolean =>
  request.method === 'POST' &&
  (segments.length === 0 || (segments.length === 1 && segments[0] === 'households'));

const isUsersMeRoute = (request: Request, segments: RouteSegments): boolean =>
  request.method === 'GET' && segments.length === 2 && segments[0] === 'users' && segments[1] === 'me';

const isHouseholdScopedRoute = (
  request: Request,
  segments: RouteSegments,
  leaf: 'leave' | 'members',
  method: 'GET' | 'POST',
): boolean => {
  if (request.method !== method) {
    return false;
  }

  if (segments.length === 2) {
    return (segments[0]?.length ?? 0) > 0 && segments[1] === leaf;
  }

  if (segments.length === 3) {
    return (
      segments[0] === 'households' &&
      (segments[1]?.length ?? 0) > 0 &&
      segments[2] === leaf
    );
  }

  return false;
};

const notImplemented = (
  _request: Request,
  context: Pick<AuthContext, 'operation_id'> | Pick<HouseholdContext, 'operation_id'>,
): Response =>
  err('internal_error', 'not implemented', 501, undefined, context.operation_id);

const handleCreateHousehold = async (request: Request): Promise<Response> =>
  withAuth(request, async (authenticatedRequest, context) => {
    const validation = await validate(createHouseholdSchema, authenticatedRequest);

    if (!validation.ok) {
      return validation.response;
    }

    return notImplemented(authenticatedRequest, context);
  });

const handleUsersMe = async (request: Request): Promise<Response> =>
  withAuth(request, notImplemented);

const handleHouseholdLeave = async (request: Request): Promise<Response> =>
  withAuth(request, withHousehold({ householdIdFrom: 'path' })(notImplemented));

const handleHouseholdMembers = async (request: Request): Promise<Response> =>
  withAuth(request, withHousehold({ householdIdFrom: 'path' })(notImplemented));

const handler = async (request: Request): Promise<Response> => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  const segments = normalizePathSegments(request);

  if (isUsersMeRoute(request, segments)) {
    return await handleUsersMe(request);
  }

  if (isCreateHouseholdRoute(request, segments)) {
    return await handleCreateHousehold(request);
  }

  if (isHouseholdScopedRoute(request, segments, 'leave', 'POST')) {
    return await handleHouseholdLeave(request);
  }

  if (isHouseholdScopedRoute(request, segments, 'members', 'GET')) {
    return await handleHouseholdMembers(request);
  }

  return err(
    'not_found',
    'route not found',
    404,
    undefined,
    extractOperationId(request),
  );
};

Deno.serve(handler);
