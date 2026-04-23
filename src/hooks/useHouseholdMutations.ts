import { useCallback, useState } from 'react';

import { meQueryKey } from '@hooks/useMe';
import { appConfig } from '@lib/env';
import { queryClient } from '@lib/queryClient';
import { useSessionStore } from '@stores/useSessionStore';

type HouseholdMutationCode =
  | 'already_member'
  | 'bad_request'
  | 'conflict'
  | 'forbidden'
  | 'internal_error'
  | 'not_found'
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
    code: HouseholdMutationCode;
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

type CreateHouseholdResponse = Readonly<{
  household: Readonly<{
    archived_at: string | null;
    id: string;
    name: string;
    owner_id: string;
  }>;
  invite_code: string | null;
}>;

type JoinHouseholdResponse = Readonly<{
  household: Readonly<{
    archived_at: string | null;
    id: string;
    name: string;
    owner_id: string;
  }>;
}>;

export class HouseholdMutationError extends Error {
  public readonly code: HouseholdMutationCode;
  public readonly issues: readonly ApiIssue[];
  public readonly operationId: string | null;
  public readonly status: number;

  public constructor(params: {
    code: HouseholdMutationCode;
    issues?: readonly ApiIssue[];
    message: string;
    operationId: string | null;
    status: number;
  }) {
    super(params.message);
    this.code = params.code;
    this.issues = params.issues ?? [];
    this.name = 'HouseholdMutationError';
    this.operationId = params.operationId;
    this.status = params.status;
  }
}

type MutationState = Readonly<{
  clearError: () => void;
  error: HouseholdMutationError | null;
  isPending: boolean;
}>;

type CreateHouseholdMutation = MutationState &
  Readonly<{
    completeOnboarding: () => Promise<void>;
    createdHousehold: CreateHouseholdResponse | null;
    createHousehold: (name: string) => Promise<CreateHouseholdResponse>;
    resetCreatedHousehold: () => void;
  }>;

type JoinHouseholdMutation = MutationState &
  Readonly<{
    joinHousehold: (inviteCode: string) => Promise<JoinHouseholdResponse>;
  }>;

const getFunctionsBaseUrl = (): string => `${appConfig.supabaseUrl}/functions/v1`;

const createOperationId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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

const getFieldIssue = (issues: readonly ApiIssue[], fieldName: string): ApiIssue | undefined =>
  issues.find((issue) => issue.path?.[0] === fieldName);

const getAccessToken = (): string => {
  const session = useSessionStore.getState().session;

  if (!session?.access_token) {
    throw new HouseholdMutationError({
      code: 'unauthorized',
      message: 'You need to sign in again before updating your household.',
      operationId: null,
      status: 401,
    });
  }

  return session.access_token;
};

const requestHouseholdMutation = async <TData>(
  path: string,
  body: Record<string, string>,
): Promise<TData> => {
  const operationId = createOperationId();
  const response = await fetch(`${getFunctionsBaseUrl()}/households${path}`, {
    body: JSON.stringify(body),
    headers: {
      apikey: appConfig.supabaseAnonKey,
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': operationId,
    },
    method: 'POST',
  });

  const payload = await parseEnvelope<TData>(response);

  if (!response.ok || !payload || !isSuccessEnvelope(payload)) {
    throw new HouseholdMutationError({
      code: payload?.error?.code ?? 'internal_error',
      issues: payload?.error?.details?.issues,
      message: payload?.error?.message ?? 'Something went wrong. Please try again.',
      operationId: payload?.operation_id ?? operationId,
      status: response.status,
    });
  }

  return payload.data;
};

export const getHouseholdFieldError = (
  error: HouseholdMutationError | null,
  fieldName: string,
): string | undefined => {
  if (!error) {
    return undefined;
  }

  const issue = getFieldIssue(error.issues, fieldName);

  return issue?.message ?? undefined;
};

export const useCreateHouseholdMutation = (): CreateHouseholdMutation => {
  const [error, setError] = useState<HouseholdMutationError | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [createdHousehold, setCreatedHousehold] = useState<CreateHouseholdResponse | null>(null);

  const createHousehold = useCallback(async (name: string): Promise<CreateHouseholdResponse> => {
    setError(null);
    setIsPending(true);

    try {
      const result = await requestHouseholdMutation<CreateHouseholdResponse>('', {
        name: name.trim(),
      });
      setCreatedHousehold(result);
      return result;
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof HouseholdMutationError
          ? caughtError
          : new HouseholdMutationError({
              code: 'internal_error',
              message: 'Failed to create your household.',
              operationId: null,
              status: 500,
            });

      setError(resolvedError);
      throw resolvedError;
    } finally {
      setIsPending(false);
    }
  }, []);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetCreatedHousehold = useCallback(() => {
    setCreatedHousehold(null);
  }, []);

  return {
    clearError,
    completeOnboarding,
    createHousehold,
    createdHousehold,
    error,
    isPending,
    resetCreatedHousehold,
  };
};

export const useJoinHouseholdMutation = (): JoinHouseholdMutation => {
  const [error, setError] = useState<HouseholdMutationError | null>(null);
  const [isPending, setIsPending] = useState(false);

  const joinHousehold = useCallback(async (inviteCode: string): Promise<JoinHouseholdResponse> => {
    setError(null);
    setIsPending(true);

    try {
      const result = await requestHouseholdMutation<JoinHouseholdResponse>('/join', {
        invite_code: inviteCode.trim().toUpperCase(),
      });
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      return result;
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof HouseholdMutationError
          ? caughtError
          : new HouseholdMutationError({
              code: 'internal_error',
              message: 'Failed to join that household.',
              operationId: null,
              status: 500,
            });

      setError(resolvedError);
      throw resolvedError;
    } finally {
      setIsPending(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    clearError,
    error,
    isPending,
    joinHousehold,
  };
};
