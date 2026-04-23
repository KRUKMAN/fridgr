import { useMutation, useQueryClient } from '@tanstack/react-query';

import { householdQueryKey } from '@hooks/useHousehold';
import { meQueryKey } from '@hooks/useMe';
import {
  getHouseholdFieldError,
  getLeaveHouseholdErrorMessage,
  HouseholdRequestError,
  leaveHousehold,
  rotateHouseholdInvite,
  type RotateInviteResponse,
  type LeaveHouseholdResponse,
  type UpdateHouseholdResponse,
  updateHousehold,
} from '@lib/householdClient';

import { clearHouseholdScopedData } from '@db/clearHouseholdScopedData';

type HouseholdMutationResult<TData> = Readonly<{
  clearError: () => void;
  data: TData | undefined;
  error: HouseholdRequestError | null;
  fieldError: (fieldName: string) => string | undefined;
  isPending: boolean;
  reset: () => void;
}>;

type UpdateHouseholdMutation = HouseholdMutationResult<UpdateHouseholdResponse> &
  Readonly<{
    submit: (name: string) => Promise<UpdateHouseholdResponse>;
  }>;

type RotateInviteMutation = HouseholdMutationResult<RotateInviteResponse> &
  Readonly<{
    submit: () => Promise<RotateInviteResponse>;
  }>;

type LeaveHouseholdMutation = HouseholdMutationResult<LeaveHouseholdResponse> &
  Readonly<{
    leaveErrorMessage: string | null;
    submit: () => Promise<LeaveHouseholdResponse>;
  }>;

const normalizeError = (error: unknown, fallbackMessage: string): HouseholdRequestError =>
  error instanceof HouseholdRequestError
    ? error
    : new HouseholdRequestError({
        code: 'internal_error',
        message: fallbackMessage,
        operationId: null,
        status: 500,
      });

const useMutationResult = <TData>(
  error: HouseholdRequestError | null,
  isPending: boolean,
  data: TData | undefined,
  reset: () => void,
): HouseholdMutationResult<TData> => ({
  clearError: reset,
  data,
  error,
  fieldError: (fieldName: string) => getHouseholdFieldError(error, fieldName),
  isPending,
  reset,
});

export const useUpdateHouseholdMutation = (householdId: string): UpdateHouseholdMutation => {
  const queryClient = useQueryClient();
  const normalizedHouseholdId = householdId.trim();
  const mutation = useMutation<UpdateHouseholdResponse, HouseholdRequestError, string>({
    mutationFn: async (name: string) => {
      try {
        return await updateHousehold(normalizedHouseholdId, name);
      } catch (error) {
        throw normalizeError(error, 'Failed to update your household.');
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: householdQueryKey(normalizedHouseholdId) }),
        queryClient.invalidateQueries({ queryKey: meQueryKey }),
      ]);
    },
  });

  return {
    ...useMutationResult(mutation.error ?? null, mutation.isPending, mutation.data, mutation.reset),
    submit: async (name: string) => mutation.mutateAsync(name),
  };
};

export const useRotateInviteMutation = (householdId: string): RotateInviteMutation => {
  const queryClient = useQueryClient();
  const normalizedHouseholdId = householdId.trim();
  const mutation = useMutation<RotateInviteResponse, HouseholdRequestError>({
    mutationFn: async () => {
      try {
        return await rotateHouseholdInvite(normalizedHouseholdId);
      } catch (error) {
        throw normalizeError(error, 'Failed to rotate the invite code.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: householdQueryKey(normalizedHouseholdId) });
    },
  });

  return {
    ...useMutationResult(mutation.error ?? null, mutation.isPending, mutation.data, mutation.reset),
    submit: async () => mutation.mutateAsync(),
  };
};

export const useLeaveHouseholdMutation = (householdId: string): LeaveHouseholdMutation => {
  const queryClient = useQueryClient();
  const normalizedHouseholdId = householdId.trim();
  const mutation = useMutation<LeaveHouseholdResponse, HouseholdRequestError>({
    mutationFn: async () => {
      try {
        return await leaveHousehold(normalizedHouseholdId);
      } catch (error) {
        throw normalizeError(error, 'Failed to leave this household.');
      }
    },
    onSuccess: async () => {
      await clearHouseholdScopedData(normalizedHouseholdId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meQueryKey }),
        queryClient.invalidateQueries({ queryKey: householdQueryKey(normalizedHouseholdId) }),
      ]);
    },
  });

  return {
    ...useMutationResult(mutation.error ?? null, mutation.isPending, mutation.data, mutation.reset),
    leaveErrorMessage: getLeaveHouseholdErrorMessage(mutation.error ?? null),
    submit: async () => mutation.mutateAsync(),
  };
};
