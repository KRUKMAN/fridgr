import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

const CLIENT_INFO_HEADER = 'fridgr-edge-functions';

const getRequiredEnv = (key: string): string => {
  const value = Deno.env.get(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const createBaseOptions = (authorization?: string) => ({
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      'X-Client-Info': CLIENT_INFO_HEADER,
    },
  },
});

export const getServiceClient = (): SupabaseClient =>
  createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    createBaseOptions(),
  );

export const getUserClient = (jwt: string): SupabaseClient =>
  createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_ANON_KEY'),
    createBaseOptions(`Bearer ${jwt}`),
  );
