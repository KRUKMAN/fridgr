import { z, type ZodType } from 'npm:zod@3.25.76';

import { err } from './response.ts';

export const QuantityBase = z.number().int().positive();
export const BaseUnit = z.enum(['mass_mg', 'volume_ml', 'count_each']);
export const NutritionBasis = z.enum(['per_100g', 'per_100ml']);
export const UuidV4 = z.string().uuid();
export const IsoDateTime = z.string().datetime();

type ValidationIssue = Readonly<{
  message: string;
  path: readonly (string | number)[];
}>;

export type ValidationResult<TData> =
  | Readonly<{
      data: TData;
      ok: true;
    }>
  | Readonly<{
      ok: false;
      response: Response;
    }>;

const getOperationId = (request: Request): string | undefined =>
  request.headers.get('Idempotency-Key')?.trim() ||
  request.headers.get('operation_id')?.trim() ||
  undefined;

const getRequestPayload = async (request: Request): Promise<unknown> => {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return Object.fromEntries(new URL(request.url).searchParams.entries());
  }

  try {
    return await request.clone().json();
  } catch {
    return undefined;
  }
};

const normalizeIssuePath = (path: readonly PropertyKey[]): (string | number)[] =>
  path.map((segment) => (typeof segment === 'symbol' ? String(segment) : segment));

const toValidationIssues = (
  issues: readonly {
    message: string;
    path: readonly PropertyKey[];
  }[],
): ValidationIssue[] =>
  issues.map((issue) => ({
    message: issue.message,
    path: normalizeIssuePath(issue.path),
  }));

export const validate = async <TData>(
  schema: ZodType<TData>,
  request: Request,
): Promise<ValidationResult<TData>> => {
  const payload = await getRequestPayload(request);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      response: err(
        'validation_failed',
        'request validation failed',
        422,
        {
          issues: toValidationIssues(parsed.error.issues),
        },
        getOperationId(request),
      ),
    };
  }

  return {
    data: parsed.data,
    ok: true,
  };
};
