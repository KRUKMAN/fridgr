import { useQuery } from '@tanstack/react-query';

import {
  fetchHousehold,
  type HouseholdDetailsResponse,
  HouseholdRequestError,
} from '@lib/householdClient';
import { useSessionStore } from '@stores/useSessionStore';

export const householdQueryKey = (householdId: string) => ['household', householdId] as const;

export const useHousehold = (householdId: string) => {
  const session = useSessionStore((state) => state.session);
  const sessionStatus = useSessionStore((state) => state.status);
  const normalizedHouseholdId = householdId.trim();

  return useQuery<HouseholdDetailsResponse, HouseholdRequestError>({
    enabled:
      sessionStatus === 'authenticated' && session !== null && normalizedHouseholdId.length > 0,
    queryFn: async () => fetchHousehold(normalizedHouseholdId),
    queryKey: householdQueryKey(normalizedHouseholdId),
    staleTime: 60_000,
  });
};
