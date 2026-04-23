
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

import * as clientModule from '../db/client.ts';
import * as responseModule from '../helpers/response.ts';
import type { RequestContext } from '../types/context.ts';

type ErrorResponseFactory = (
  code: 'unauthorized',
  message: string,
  status: number,
  details?: unknown,
  operationId?: string,
) => Response;

type ClientFactory = (jwt: string) => SupabaseClient;

type AuthDeps = Readonly<{
  createUserClient: ClientFactory;
  err: ErrorResponseFactory;
}>;

type AuthUser = Readonly<{
  id: string;
}>;

type GetUserResult = Readonly<{
  data: Readonly<{
    user: AuthUser | null;
  }>;
  error: Error | null;
}>;

export type AuthContext = Readonly<
  RequestContext & {
    jwt: string;
  }
>;

export type AuthenticatedHandler = (
  request: Request,
  context: AuthContext,
) => Response | Promise<Response>;

const BEARER_TOKEN_PATTERN = /^Bearer\s+(.+)$/i;

const requireCreateUserClient = (): ClientFactory => {
  const createUserClient = (
    clientModule as Partial<{
      getUserClient: ClientFactory;
    }>
  ).getUserClient;

  if (typeof createUserClient !== 'function') {
    throw new Error('Expected getUserClient() from _shared/db/client.ts');
  }

  return createUserClient;
};

const requireErr = (): ErrorResponseFactory => {
  const err = (
    responseModule as Partial<{
      err: ErrorResponseFactory;
    }>
  ).err;

  if (typeof err !== 'function') {
    throw new Error('Expected err() from _shared/helpers/response.ts');
  }

  return err;
};

const defaultDeps: AuthDeps = {
  createUserClient: (jwt: string): SupabaseClient => requireCreateUserClient()(jwt),
  err: (
    code: 'unauthorized',
    message: string,
    status: number,
    details?: unknown,
    operationId?: string,
  ): Response => requireErr()(code, message, status, details, operationId),
};

const extractBearerToken = (authorization: string | null): string | null => {
  if (!authorization) {
    return null;
  }

  const match = authorization.match(BEARER_TOKEN_PATTERN);

  if (!match) {
    return null;
  }

  const token = match[1]?.trim();

  return token ? token : null;
};

export const extractOperationId = (request: Request): string | undefined => {
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();

  if (idempotencyKey) {
    return idempotencyKey;
  }

  const legacyOperationId = request.headers.get('operation_id')?.trim();

  return legacyOperationId || undefined;
};

const unauthorized = (
  deps: AuthDeps,
  message: string,
  operationId?: string,
): Response => deps.err('unauthorized', message, 401, undefined, operationId);

const getUser = async (
  supabase: SupabaseClient,
  jwt: string,
): Promise<GetUserResult> => {
  const result = await supabase.auth.getUser(jwt);

  return result as GetUserResult;
};

export const createWithAuth = (deps: AuthDeps) =>
  async (request: Request, handler: AuthenticatedHandler): Promise<Response> => {
    const operationId = extractOperationId(request);
    const jwt = extractBearerToken(request.headers.get('Authorization'));

    if (!jwt) {
      return unauthorized(deps, 'missing bearer token', operationId);
    }

    const supabase = deps.createUserClient(jwt);
    const { data, error } = await getUser(supabase, jwt);
    const userId = data.user?.id;

    if (error || !userId) {
      return unauthorized(deps, 'invalid token', operationId);
    }

    return handler(request, {
      jwt,
      operation_id: operationId,
      supabase,
      user_id: userId,
    });
  };

export const withAuth = createWithAuth(defaultDeps);
