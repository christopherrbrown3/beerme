import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { type Database } from '../types/database';

const nodeEnvironment = typeof process === 'undefined' ? undefined : process.env;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? nodeEnvironment?.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? nodeEnvironment?.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let client: SupabaseClient<Database> | undefined;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  client ??= createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}
