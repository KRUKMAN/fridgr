import { Platform } from 'react-native';

export const LOCAL_DATABASE_NAME = 'fridgr.db';

export const isLocalDatabaseSupported = (): boolean =>
  Platform.OS !== 'web' || typeof globalThis.SharedArrayBuffer === 'function';

export const getLocalDatabaseUnsupportedMessage = (): string =>
  'Local SQLite preview is unavailable in this browser because SharedArrayBuffer is disabled.';
