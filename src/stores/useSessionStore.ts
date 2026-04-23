import { create } from 'zustand';

import type { Session } from '@supabase/supabase-js';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionState {
  session: Session | null;
  status: SessionStatus;
  setAuthenticated: (session: Session) => void;
  setLoading: () => void;
  setUnauthenticated: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  setAuthenticated: (session) => {
    set({ session, status: 'authenticated' });
  },
  setLoading: () => {
    set({ status: 'loading' });
  },
  setUnauthenticated: () => {
    set({ session: null, status: 'unauthenticated' });
  },
  status: 'loading',
}));
