import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

export type RequestContext = Readonly<{
  household_id?: string;
  operation_id?: string;
  supabase: SupabaseClient;
  user_id: string;
}>;
