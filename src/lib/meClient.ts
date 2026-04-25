import { appConfig } from '@lib/env';

import type { Session } from '@supabase/supabase-js';

export interface MeHousehold {
  id: string;
  name: string;
  role: 'member' | 'owner';
}

export interface MeUser {
  created_at: string;
  display_name: string | null;
  email: string;
  id: string;
}

export interface MeResponse {
  households: MeHousehold[];
  user: MeUser;
}

interface ApiErrorEnvelope {
  error: {
    code: string;
    details?: Record<string, unknown>;
    message: string;
  } | null;
  operation_id: string;
}

interface ApiSuccessEnvelope<TData> {
  data: TData;
  error: null;
  operation_id: string;
}

type ApiEnvelope<TData> = ApiErrorEnvelope | ApiSuccessEnvelope<TData>;

const isSuccessEnvelope = <TData>(
  payload: ApiEnvelope<TData>,
): payload is ApiSuccessEnvelope<TData> => payload.error === null;

export class MeRequestError extends Error {
  public readonly code: string;
  public readonly status: number;

  public constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.name = 'MeRequestError';
    this.status = status;
  }
}

const createOperationId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `me-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const getFunctionsBaseUrl = (): string => `${appConfig.supabaseUrl}/functions/v1`;

export const fetchMe = async (session: Session): Promise<MeResponse> => {
  const response = await fetch(`${getFunctionsBaseUrl()}/households/users/me`, {
    headers: {
      apikey: appConfig.supabaseAnonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': createOperationId(),
    },
    method: 'GET',
  });

  const payload = (await response.json()) as ApiEnvelope<MeResponse>;

  if (!response.ok || !isSuccessEnvelope(payload)) {
    throw new MeRequestError(
      payload.error?.code ?? 'internal_error',
      payload.error?.message ?? 'Unable to load the current user.',
      response.status,
    );
  }

  return payload.data;
};
