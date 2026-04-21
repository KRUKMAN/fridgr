export type AppEnvironment = 'development' | 'staging' | 'production';

type ExpoPublicEnvKey =
  | 'EXPO_PUBLIC_APP_ENV'
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

const DEFAULT_APP_ENVIRONMENT: AppEnvironment = 'development';

const isAppEnvironment = (value: string): value is AppEnvironment =>
  value === 'development' || value === 'staging' || value === 'production';

const getRequiredExpoPublicEnv = (key: ExpoPublicEnvKey): string => {
  const value = process.env[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required Expo environment variable: ${key}`);
  }

  return value;
};

const getAppEnvironment = (): AppEnvironment => {
  const value = process.env.EXPO_PUBLIC_APP_ENV;

  if (typeof value !== 'string' || value.trim().length === 0) {
    return DEFAULT_APP_ENVIRONMENT;
  }

  return isAppEnvironment(value) ? value : DEFAULT_APP_ENVIRONMENT;
};

export const appEnvironment = getAppEnvironment();

export const appConfig = Object.freeze({
  appEnvironment,
  supabaseAnonKey: getRequiredExpoPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseUrl: getRequiredExpoPublicEnv('EXPO_PUBLIC_SUPABASE_URL'),
});
