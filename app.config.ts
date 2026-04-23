import type { ConfigContext, ExpoConfig } from '@expo/config';

type AppEnvironment = 'development' | 'staging' | 'production';

const DEFAULT_APP_ENVIRONMENT: AppEnvironment = 'development';

const isAppEnvironment = (value: string): value is AppEnvironment =>
  value === 'development' || value === 'staging' || value === 'production';

const getAppEnvironment = (): AppEnvironment => {
  const rawValue = process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV;

  if (typeof rawValue !== 'string') {
    return DEFAULT_APP_ENVIRONMENT;
  }

  return isAppEnvironment(rawValue) ? rawValue : DEFAULT_APP_ENVIRONMENT;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnvironment = getAppEnvironment();
  const isStaging = appEnvironment === 'staging';
  const publicSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const publicSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return {
    ...config,
    name: isStaging ? 'fridgr (Staging)' : 'fridgr',
    slug: isStaging ? 'fridgr-staging' : 'fridgr',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'fridgr',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#22C55E',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#22C55E',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...config.extra,
      appEnv: appEnvironment,
      publicEnv: {
        appEnv: appEnvironment,
        supabaseAnonKey: publicSupabaseAnonKey,
        supabaseUrl: publicSupabaseUrl,
      },
    },
  };
};
