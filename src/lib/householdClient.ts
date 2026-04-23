import { appConfig } from '@lib/env';
import { useSessionStore } from '@stores/useSessionStore';

type HouseholdRole = 'member' | 'owner';

type HouseholdRequestCode =
  | 'already_member'
  | 'bad_request'
  | 'conflict'
  | 'forbidden'
  | 'internal_error'
  | 'not_found'
  | 'sole_owner_cannot_leave'
  | 'unauthorized'
  | 'validation_error'
  | 'validation_failed';

type ApiIssue = Readonly<{
  code?: string;
  message?: string;
  path?: readonly (number | string)[];
}>;

type ApiErrorEnvelope = Readonly<{
  data: null;
  error: Readonly<{
    code: HouseholdRequestCode;
    details?: Readonly<{
      issues?: readonly ApiIssue[];
    }>;
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

export type HouseholdSummary = Readonly<{
  archived_at: string | null;
  id: string;
  invite_code: string | null;
  name: string;
  owner_id: string;
}>;

export type HouseholdMember = Readonly<{
  avatar_url: string | null;
  display_name: string | null;
  joined_at: string;
  role: HouseholdRole;
  user_id: string;
}>;

export type HouseholdDetailsResponse = Readonly<{
  household: HouseholdSummary;
  members: readonly HouseholdMember[];
}>;

export type UpdateHouseholdResponse = Readonly<{
  household: HouseholdSummary;
}>;

export type RotateInviteResponse = Readonly<{
  invite_code: string | null;
}>;

export type LeaveHouseholdResponse = Readonly<{
  archived: boolean;
  household_id: string;
}>;

export class HouseholdRequestError extends Error {
  public readonly code: HouseholdRequestCode;
  public readonly issues: readonly ApiIssue[];
  public readonly operationId: string | null;
  public readonly status: number;

  public constructor(params: {
    code: HouseholdRequestCode;
    issues?: readonly ApiIssue[];
    message: string;
    operationId: string | null;
    status: number;
  }) {
    super(params.message);
    this.code = params.code;
    this.issues = params.issues ?? [];
    this.name = 'HouseholdRequestError';
    this.operationId = params.operationId;
    this.status = params.status;
  }
}

const getFunctionsBaseUrl = (): string => `${appConfig.supabaseUrl}/functions/v1`;

const createOperationId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `household-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const getAccessToken = (): string => {
  const session = useSessionStore.getState().session;

  if (!session?.access_token) {
    throw new HouseholdRequestError({
      code: 'unauthorized',
      message: 'You need to sign in again before changing this household.',
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

const requestHousehold = async <TData>(
  path: string,
  init?: Readonly<{
    body?: Record<string, string>;
    method?: 'GET' | 'PATCH' | 'POST';
  }>,
): Promise<TData> => {
  const method = init?.method ?? 'GET';
  const operationId = createOperationId();
  const response = await fetch(`${getFunctionsBaseUrl()}/households${path}`, {
    body: init?.body ? JSON.stringify(init.body) : undefined,
    headers: {
      apikey: appConfig.supabaseAnonKey,
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': operationId,
    },
    method,
  });
  const payload = await parseEnvelope<TData>(response);

  if (!response.ok || !payload || !isSuccessEnvelope(payload)) {
    throw new HouseholdRequestError({
      code: payload?.error?.code ?? 'internal_error',
      issues: payload?.error?.details?.issues,
      message: payload?.error?.message ?? 'Something went wrong. Please try again.',
      operationId: payload?.operation_id ?? operationId,
      status: response.status,
    });
  }

  return payload.data;
};

export const fetchHousehold = async (householdId: string): Promise<HouseholdDetailsResponse> =>
  requestHousehold<HouseholdDetailsResponse>(`/${householdId}`, {
    method: 'GET',
  });

export const updateHousehold = async (
  householdId: string,
  name: string,
): Promise<UpdateHouseholdResponse> =>
  requestHousehold<UpdateHouseholdResponse>(`/${householdId}`, {
    body: {
      name: name.trim(),
    },
    method: 'PATCH',
  });

export const rotateHouseholdInvite = async (householdId: string): Promise<RotateInviteResponse> =>
  requestHousehold<RotateInviteResponse>(`/${householdId}/rotate-invite`, {
    body: {},
    method: 'POST',
  });

export const leaveHousehold = async (householdId: string): Promise<LeaveHouseholdResponse> =>
  requestHousehold<LeaveHouseholdResponse>(`/${householdId}/leave`, {
    body: {},
    method: 'POST',
  });

export const getHouseholdFieldError = (
  error: HouseholdRequestError | null,
  fieldName: string,
): string | undefined =>
  error?.issues.find((issue) => issue.path?.[0] === fieldName)?.message ?? undefined;

export const getLeaveHouseholdErrorMessage = (
  error: HouseholdRequestError | null,
): string | null => {
  if (!error) {
    return null;
  }

  if (error.code === 'sole_owner_cannot_leave') {
    return 'You are the only owner. Transfer ownership before leaving this household.';
  }

  return error.message;
};
