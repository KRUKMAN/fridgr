import { openDatabaseSync } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { queryClient } from '@lib/queryClient';
import { supabase } from '@lib/supabase';
import { useSessionStore } from '@stores/useSessionStore';

import { isLocalDatabaseSupported, LOCAL_DATABASE_NAME } from '@db/support';

const USER_SCOPED_TABLES = [
  'ai_capture_items',
  'ai_capture_sessions',
  'daily_summaries',
  'diary_entries',
  'personal_food_items',
  'private_inventory_items',
] as const;

export class SignOutError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'SignOutError';
  }
}

const clearLocalUserScopedData = async (): Promise<void> => {
  if (!isLocalDatabaseSupported()) {
    return;
  }

  const database = openDatabaseSync(LOCAL_DATABASE_NAME);

  try {
    await database.execAsync('PRAGMA foreign_keys = OFF;');

    for (const tableName of USER_SCOPED_TABLES) {
      await database.execAsync(`DELETE FROM ${tableName};`);
    }

    await database.execAsync('PRAGMA foreign_keys = ON;');
  } finally {
    await database.closeAsync().catch(() => undefined);
  }
};

type UseSignOutResult = Readonly<{
  error: SignOutError | null;
  isPending: boolean;
  resetError: () => void;
  signOut: () => Promise<void>;
}>;

export const useSignOut = (): UseSignOutResult => {
  const [error, setError] = useState<SignOutError | null>(null);
  const [isPending, setIsPending] = useState(false);

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    setIsPending(true);
    let signOutError: SignOutError | null = null;

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        signOutError = new SignOutError(error.message);
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      await clearLocalUserScopedData();
      useSessionStore.getState().setUnauthenticated();

      if (signOutError) {
        throw signOutError;
      }
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof SignOutError
          ? caughtError
          : new SignOutError('We could not sign you out. Please try again.');

      setError(resolvedError);
      throw resolvedError;
    } finally {
      setIsPending(false);
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isPending,
    resetError,
    signOut,
  };
};
