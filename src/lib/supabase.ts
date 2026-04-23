import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { appConfig } from '@lib/env';
import { createSessionStorage } from '@lib/storage';

export const supabase = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: createSessionStorage(),
  },
});
