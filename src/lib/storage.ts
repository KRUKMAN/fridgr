import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { SupportedStorage } from '@supabase/supabase-js';

const isBrowserStorageAvailable = (): boolean => {
  if (Platform.OS !== 'web') {
    return false;
  }

  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

export const createSessionStorage = (): SupportedStorage => ({
  getItem: async (key: string): Promise<string | null> => {
    if (isBrowserStorageAvailable()) {
      return window.localStorage.getItem(key);
    }

    return SecureStore.getItemAsync(key);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isBrowserStorageAvailable()) {
      window.localStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isBrowserStorageAvailable()) {
      window.localStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },
});
