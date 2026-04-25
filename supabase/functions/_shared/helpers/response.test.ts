import { assertEquals } from 'jsr:@std/assert@1.0.19';

import { err, handleOptions, ok, type ResponseEnvelope } from './response.ts';

const createRequest = (method = 'GET'): Request =>
  new Request('https://example.com/functions/v1/households', { method });

Deno.test('ok returns the standard success envelope with JSON and CORS headers', async () => {
  const response = ok({ household_id: 'household-123' }, 'op-123');
  const payload = (await response.json()) as ResponseEnvelope<{ household_id: string }>;

  assertEquals(response.status, 200);
  assertEquals(payload, {
    data: { household_id: 'household-123' },
    error: null,
    operation_id: 'op-123',
  });
  assertEquals(response.headers.get('Content-Type'), 'application/json; charset=utf-8');
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(
    response.headers.get('Access-Control-Allow-Headers'),
    'Authorization, Idempotency-Key, Content-Type, apikey',
  );
  assertEquals(
    response.headers.get('Access-Control-Allow-Methods'),
    'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  );
});

Deno.test('err returns the standard error envelope and preserves details', async () => {
  const response = err(
    'validation_failed',
    'invalid payload',
    422,
    {
      issues: [{ path: ['quantity_base'], message: 'Required' }],
    },
    'op-456',
  );
  const payload = (await response.json()) as ResponseEnvelope<never>;

  assertEquals(response.status, 422);
  assertEquals(payload, {
    data: null,
    error: {
      code: 'validation_failed',
      message: 'invalid payload',
      details: {
        issues: [{ path: ['quantity_base'], message: 'Required' }],
      },
    },
    operation_id: 'op-456',
  });
});

Deno.test('handleOptions returns a 204 preflight response with CORS headers', () => {
  const response = handleOptions(createRequest('OPTIONS'));

  assertEquals(response?.status, 204);
  assertEquals(response?.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(
    response?.headers.get('Access-Control-Allow-Headers'),
    'Authorization, Idempotency-Key, Content-Type, apikey',
  );
  assertEquals(response?.headers.get('Content-Type'), null);
});

Deno.test('handleOptions returns null for non-OPTIONS requests', () => {
  const response = handleOptions(createRequest('GET'));

  assertEquals(response, null);
});
