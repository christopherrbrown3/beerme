import { getSupabaseClient } from '../lib/supabase';
import { normalizeDisplayName } from '../utils/profileValidation';

export async function getProfile(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateDisplayName(userId: string, displayName: string | null | undefined) {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update({ display_name: normalizeDisplayName(displayName) })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
