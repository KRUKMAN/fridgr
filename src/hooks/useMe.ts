import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fetchMe, MeRequestError, type MeResponse } from '@lib/meClient';
import { useSessionStore } from '@stores/useSessionStore';

export const meQueryKey = ['me'] as const;

export const useMe = () => {
  const session = useSessionStore((state) => state.session);
  const sessionStatus = useSessionStore((state) => state.status);
  const setUnauthenticated = useSessionStore((state) => state.setUnauthenticated);

  const query = useQuery<MeResponse, MeRequestError>({
    enabled: sessionStatus === 'authenticated' && session !== null,
    queryFn: async () => {
      if (!session) {
        throw new MeRequestError('unauthorized', 'Authentication is required.', 401);
      }

      return fetchMe(session);
    },
    queryKey: meQueryKey,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.error?.status === 401) {
      setUnauthenticated();
    }
  }, [query.error?.status, setUnauthenticated]);

  return query;
};
