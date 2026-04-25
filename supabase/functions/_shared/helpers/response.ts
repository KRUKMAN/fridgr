export type ErrorCode =
  | 'bad_request'
  | 'already_member'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'sole_owner_cannot_leave'
  | 'validation_error'
  | 'validation_failed'
  | 'rate_limited'
  | 'internal_error';

type ErrorPayload = {
  code: ErrorCode;
  message: string;
  details?: unknown;
};

export type ResponseEnvelope<T> = {
  data: T | null;
  error: ErrorPayload | null;
  operation_id: string | null;
};

const CORS_ALLOW_HEADERS = 'Authorization, Idempotency-Key, Content-Type, apikey';
const CORS_ALLOW_METHODS = 'GET, POST, PATCH, PUT, DELETE, OPTIONS';

const buildCorsHeaders = (): Headers => {
  const headers = new Headers();

  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS);
  headers.set('Access-Control-Allow-Methods', CORS_ALLOW_METHODS);
  headers.set('Access-Control-Max-Age', '86400');

  return headers;
};

const buildJsonHeaders = (): Headers => {
  const headers = buildCorsHeaders();

  headers.set('Content-Type', 'application/json; charset=utf-8');

  return headers;
};

const jsonResponse = <T>(envelope: ResponseEnvelope<T>, status: number): Response =>
  new Response(JSON.stringify(envelope), {
    status,
    headers: buildJsonHeaders(),
  });

export const ok = <T>(data: T, operationId?: string, status = 200): Response =>
  jsonResponse(
    {
      data,
      error: null,
      operation_id: operationId ?? null,
    },
    status,
  );

export const err = (
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown,
  operationId?: string,
): Response =>
  jsonResponse(
    {
      data: null,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
      operation_id: operationId ?? null,
    },
    status,
  );

export const handleOptions = (request: Request): Response | null => {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
};
