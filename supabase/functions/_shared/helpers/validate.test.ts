import { assertEquals } from 'jsr:@std/assert@1.0.19';
import { z } from 'npm:zod@3.25.76';

import { BaseUnit, QuantityBase, validate } from './validate.ts';

const createRequest = (body: unknown): Request =>
  new Request('https://example.com/api/v1/diary/entries', {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'op-validate-123',
    },
    method: 'POST',
  });

const testSchema = z
  .object({
    base_unit: BaseUnit,
    quantity_base: QuantityBase,
  })
  .strict();

Deno.test('validate returns parsed data for a valid JSON body', async () => {
  const result = await validate(
    testSchema,
    createRequest({
      base_unit: 'mass_mg',
      quantity_base: 1200,
    }),
  );

  assertEquals(result.ok, true);

  if (result.ok) {
    assertEquals(result.data, {
      base_unit: 'mass_mg',
      quantity_base: 1200,
    });
  }
});

Deno.test('validate returns a 422 envelope with strict-schema issues for extra fields', async () => {
  const result = await validate(
    testSchema,
    createRequest({
      base_unit: 'mass_mg',
      extra_field: 'nope',
      quantity_base: 1200,
    }),
  );

  assertEquals(result.ok, false);

  if (!result.ok) {
    assertEquals(result.response.status, 422);
    assertEquals(await result.response.json(), {
      data: null,
      error: {
        code: 'validation_failed',
        details: {
          issues: [
            {
              message: "Unrecognized key(s) in object: 'extra_field'",
              path: [],
            },
          ],
        },
        message: 'request validation failed',
      },
      operation_id: 'op-validate-123',
    });
  }
});
