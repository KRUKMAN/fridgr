import { createWithAuth } from './auth.ts';

type DenoTest = (name: string, fn: () => void | Promise<void>) => void;

type ErrorBody = Readonly<{
  error: Readonly<{
    code: string;
    message: string;
  }>;
  operation_id?: string;
}>;

type FakeGetUserResult = Readonly<{
  data: Readonly<{
    user: Readonly<{
      id: string;
    }> | null;
  }>;
  error: Error | null;
}>;

type FakeSupabaseClient = Readonly<{
  auth: Readonly<{
    getUser: (jwt: string) => Promise<FakeGetUserResult>;
  }>;
}>;

const denoTest = (Deno as unknown as { test: DenoTest }).test;

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertEqual = <T>(actual: T, expected: T, message: string): void => {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const createErrorResponse = (
  code: string,
  message: string,
  status: number,
  _details?: unknown,
  operationId?: string,
): Response =>
  new Response(
    JSON.stringify({
      error: { code, message },
      operation_id: operationId,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      status,
    },
  );

const readError = async (response: Response): Promise<ErrorBody> => {
  const json = (await response.json()) as ErrorBody;

  return json;
};

const createClient = (
  getUser: (jwt: string) => Promise<FakeGetUserResult>,
): FakeSupabaseClient => ({
  auth: {
    getUser,
  },
});

denoTest('withAuth returns 401 when the bearer token is missing', async () => {
  let createClientCalls = 0;
  let handlerCalls = 0;

  const withAuth = createWithAuth({
    createUserClient: () => {
      createClientCalls += 1;
      return createClient(async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
      })) as never;
    },
    err: createErrorResponse,
  });

  const response = await withAuth(
    new Request('https://example.com/api/v1/households', {
      headers: {
        'Idempotency-Key': 'op-from-idempotency',
      },
    }),
    async () => {
      handlerCalls += 1;
      return new Response('ok');
    },
  );

  const body = await readError(response);

  assertEqual(response.status, 401, 'missing bearer should return 401');
  assertEqual(body.error.code, 'unauthorized', 'missing bearer should use unauthorized code');
  assertEqual(body.error.message, 'missing bearer token', 'missing bearer should explain the error');
  assertEqual(body.operation_id, 'op-from-idempotency', 'idempotency key should be echoed');
  assertEqual(createClientCalls, 0, 'client should not be created when auth is missing');
  assertEqual(handlerCalls, 0, 'handler should not run when auth is missing');
});

denoTest('withAuth falls back to operation_id header and rejects invalid tokens', async () => {
  let observedJwt = '';
  let createClientJwt = '';
  let handlerCalls = 0;

  const client = createClient(async (jwt: string) => {
    observedJwt = jwt;

    return {
      data: { user: null },
      error: new Error('JWT expired'),
    };
  });

  const withAuth = createWithAuth({
    createUserClient: (jwt: string) => {
      createClientJwt = jwt;
      return client as never;
    },
    err: createErrorResponse,
  });

  const response = await withAuth(
    new Request('https://example.com/api/v1/households', {
      headers: {
        Authorization: 'Bearer invalid-token',
        operation_id: 'op-from-legacy-header',
      },
    }),
    async () => {
      handlerCalls += 1;
      return new Response('ok');
    },
  );

  const body = await readError(response);

  assertEqual(createClientJwt, 'invalid-token', 'user client should receive the bearer token');
  assertEqual(observedJwt, 'invalid-token', 'getUser should verify the same bearer token');
  assertEqual(response.status, 401, 'invalid token should return 401');
  assertEqual(body.error.code, 'unauthorized', 'invalid token should use unauthorized code');
  assertEqual(body.error.message, 'invalid token', 'invalid token should explain the error');
  assertEqual(body.operation_id, 'op-from-legacy-header', 'operation_id fallback should be echoed');
  assertEqual(handlerCalls, 0, 'handler should not run when token verification fails');
});

denoTest('withAuth passes auth context to the handler when the token is valid', async () => {
  const seenContext: Array<{
    jwt: string;
    operation_id?: string;
    supabase: FakeSupabaseClient;
    user_id: string;
  }> = [];

  const client = createClient(async (jwt: string) => {
    assertEqual(jwt, 'valid-token', 'valid token should be verified');

    return {
      data: { user: { id: 'user-123' } },
      error: null,
    };
  });

  const withAuth = createWithAuth({
    createUserClient: (jwt: string) => {
      assertEqual(jwt, 'valid-token', 'user client should be created with the bearer token');
      return client as never;
    },
    err: createErrorResponse,
  });

  const response = await withAuth(
    new Request('https://example.com/api/v1/diary', {
      headers: {
        Authorization: 'Bearer valid-token',
        'Idempotency-Key': 'op-preferred',
        operation_id: 'op-fallback',
      },
    }),
    async (_request, context) => {
      seenContext.push({
        jwt: context.jwt,
        operation_id: context.operation_id,
        supabase: context.supabase as unknown as FakeSupabaseClient,
        user_id: context.user_id,
      });

      return new Response('authorized', { status: 200 });
    },
  );

  assertEqual(response.status, 200, 'valid token should allow the handler to run');
  assertEqual(seenContext.length, 1, 'handler should run exactly once');
  assertEqual(seenContext[0]?.user_id, 'user-123', 'user id should be attached to context');
  assertEqual(seenContext[0]?.jwt, 'valid-token', 'jwt should be attached to context');
  assertEqual(
    seenContext[0]?.operation_id,
    'op-preferred',
    'idempotency key should win over the fallback header',
  );
  assert(seenContext[0]?.supabase === client, 'user-scoped client should be attached to context');
});
