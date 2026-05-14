import { appConfig } from '@lib/env';
import { useSessionStore } from '@stores/useSessionStore';

type BaseUnit = 'count_each' | 'mass_mg' | 'volume_ml';
type NutritionBasis = 'per_100g' | 'per_100ml';
type FridgeSourceType = 'global' | 'household' | 'variation';

type FridgeRequestCode =
  | 'bad_request'
  | 'forbidden'
  | 'internal_error'
  | 'not_found'
  | 'unauthorized';

type ApiErrorEnvelope = Readonly<{
  data: null;
  error: Readonly<{
    code: FridgeRequestCode;
    message: string;
  }>;
  operation_id: string | null;
}>;

type ApiSuccessEnvelope<TData> = Readonly<{
  data: TData;
  error: null;
  operation_id: string | null;
}>;

type ApiEnvelope<TData> = ApiErrorEnvelope | ApiSuccessEnvelope<TData>;

export type FridgeItemSnapshot = Readonly<{
  carbs_mg_per_100_unit: number;
  category: string | null;
  density_mg_per_ml: number | null;
  fat_mg_per_100_unit: number;
  food_name: string;
  kcal_per_100_unit: number;
  nutrition_basis: NutritionBasis;
  protein_mg_per_100_unit: number;
}>;

export type FridgeItem = Readonly<{
  added_by: string;
  archived_at: string | null;
  base_unit: BaseUnit;
  created_at: string;
  estimated_expiry: string | null;
  food_variation_id: string | null;
  global_food_id: string | null;
  household_food_item_id: string | null;
  household_id: string;
  id: string;
  quantity_base: number;
  snapshot: FridgeItemSnapshot;
  source_type: FridgeSourceType;
  unit_display: string;
  updated_at: string;
  version: number;
}>;

export class FridgeRequestError extends Error {
  public readonly code: FridgeRequestCode;
  public readonly operationId: string | null;
  public readonly status: number;

  public constructor(params: {
    code: FridgeRequestCode;
    message: string;
    operationId: string | null;
    status: number;
  }) {
    super(params.message);
    this.code = params.code;
    this.name = 'FridgeRequestError';
    this.operationId = params.operationId;
    this.status = params.status;
  }
}

const getFunctionsBaseUrl = (): string => `${appConfig.supabaseUrl}/functions/v1`;

const createOperationId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `fridge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const getAccessToken = (): string => {
  const session = useSessionStore.getState().session;

  if (!session?.access_token) {
    throw new FridgeRequestError({
      code: 'unauthorized',
      message: 'Sign in again to view fridge items.',
      operationId: null,
      status: 401,
    });
  }

  return session.access_token;
};

const isSuccessEnvelope = <TData>(
  payload: ApiEnvelope<TData>,
): payload is ApiSuccessEnvelope<TData> => payload.error === null;

const parseEnvelope = async <TData>(response: Response): Promise<ApiEnvelope<TData> | null> => {
  try {
    return (await response.json()) as ApiEnvelope<TData>;
  } catch {
    return null;
  }
};

type FridgeListResponse = Readonly<{ items: readonly FridgeItem[] }>;

export const fetchFridgeItems = async (householdId: string): Promise<readonly FridgeItem[]> => {
  const operationId = createOperationId();
  const response = await fetch(
    `${getFunctionsBaseUrl()}/fridge-items/households/${householdId}/fridge`,
    {
      headers: {
        apikey: appConfig.supabaseAnonKey,
        Authorization: `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': operationId,
      },
      method: 'GET',
    },
  );

  const payload = await parseEnvelope<FridgeListResponse>(response);

  if (!response.ok || !payload || !isSuccessEnvelope(payload)) {
    throw new FridgeRequestError({
      code: (payload as ApiErrorEnvelope | null)?.error?.code ?? 'internal_error',
      message:
        (payload as ApiErrorEnvelope | null)?.error?.message ??
        'Could not load fridge items. Please try again.',
      operationId: payload?.operation_id ?? operationId,
      status: response.status,
    });
  }

  return payload.data.items;
};
