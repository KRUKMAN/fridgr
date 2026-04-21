import { createClient } from '@supabase/supabase-js';

import { appConfig } from '@lib/env';

export const supabase = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey);
