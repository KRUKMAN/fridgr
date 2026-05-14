import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fetchFridgeItems, type FridgeItem, FridgeRequestError } from '@lib/fridgeClient';
import { useSessionStore } from '@stores/useSessionStore';

export const fridgeItemsQueryKey = (householdId: string) => ['fridge-items', householdId] as const;

export const useFridgeItems = (householdId: string) => {
  const session = useSessionStore((state) => state.session);
  const sessionStatus = useSessionStore((state) => state.status);
  const setUnauthenticated = useSessionStore((state) => state.setUnauthenticated);
  const normalizedId = householdId.trim();

  const query = useQuery<readonly FridgeItem[], FridgeRequestError>({
    enabled: sessionStatus === 'authenticated' && session !== null && normalizedId.length > 0,
    queryFn: async () => fetchFridgeItems(normalizedId),
    queryKey: fridgeItemsQueryKey(normalizedId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.error?.status === 401) {
      setUnauthenticated();
    }
  }, [query.error?.status, setUnauthenticated]);

  return query;
};
