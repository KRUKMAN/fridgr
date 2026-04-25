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

const getRequiredConfigValue = (
  config: PublicEnvConfig,
  key: keyof PublicEnvConfig,
  fallbackKey: string,
): string => {
  const value = config[key] ?? process.env[fallbackKey];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required Expo configuration value: ${fallbackKey}`);
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

export const appConfig = Object.freeze({
  appEnvironment,
  supabaseAnonKey: getRequiredConfigValue(
    publicEnv,
    'supabaseAnonKey',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ),
  supabaseUrl: getRequiredConfigValue(publicEnv, 'supabaseUrl', 'EXPO_PUBLIC_SUPABASE_URL'),
});
