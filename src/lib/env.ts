import Constants from 'expo-constants';

export type AppEnvironment = 'development' | 'staging' | 'production';

interface PublicEnvConfig {
  appEnv?: string;
  supabaseAnonKey?: string;
  supabaseUrl?: string;
}

interface AppConfigExtra {
  appEnv?: string;
  publicEnv?: PublicEnvConfig;
}

const DEFAULT_APP_ENVIRONMENT: AppEnvironment = 'development';

const isAppEnvironment = (value: string): value is AppEnvironment =>
  value === 'development' || value === 'staging' || value === 'production';

const getAppExtra = (): AppConfigExtra => {
  const extra = Constants.expoConfig?.extra;
  return typeof extra === 'object' && extra !== null ? (extra as AppConfigExtra) : {};
};

const getConfigValue = (
  config: PublicEnvConfig,
  key: keyof PublicEnvConfig,
  fallbackKey: string,
): string | null => {
  const value = config[key] ?? process.env[fallbackKey];

  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value;
};

const extra = getAppExtra();
const publicEnv = extra.publicEnv ?? {};
const rawAppEnvironment = publicEnv.appEnv ?? extra.appEnv ?? process.env.EXPO_PUBLIC_APP_ENV;

export const appEnvironment: AppEnvironment =
  typeof rawAppEnvironment === 'string' && isAppEnvironment(rawAppEnvironment)
    ? rawAppEnvironment
    : DEFAULT_APP_ENVIRONMENT;

const supabaseAnonKey = getConfigValue(
  publicEnv,
  'supabaseAnonKey',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
);
const supabaseUrl = getConfigValue(publicEnv, 'supabaseUrl', 'EXPO_PUBLIC_SUPABASE_URL');

export const missingPublicConfig = [
  ...(supabaseUrl ? [] : ['EXPO_PUBLIC_SUPABASE_URL']),
  ...(supabaseAnonKey ? [] : ['EXPO_PUBLIC_SUPABASE_ANON_KEY']),
] as const;

export const isSupabaseConfigured = missingPublicConfig.length === 0;

export const appConfig = Object.freeze({
  appEnvironment,
  supabaseAnonKey: supabaseAnonKey ?? 'missing-preview-anon-key',
  supabaseUrl: supabaseUrl ?? 'https://example.supabase.co',
});
