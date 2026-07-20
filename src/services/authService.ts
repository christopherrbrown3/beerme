import { type AuthError } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabase';
import { normalizeDisplayName, normalizeUsername } from '../utils/profileValidation';

const INTERNAL_AUTH_DOMAIN = 'users.beerme.invalid';

export type SignUpInput = {
  password: string;
  username: string;
  displayName?: string | null;
};

export function getInternalAuthIdentifier(username: string) {
  return `${normalizeUsername(username)}@${INTERNAL_AUTH_DOMAIN}`;
}

export async function signInWithPassword(username: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: getInternalAuthIdentifier(username),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUpWithPassword({ password, username, displayName }: SignUpInput) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const supabase = getSupabaseClient();

  const { data: isAvailable, error: availabilityError } = await supabase.rpc(
    'is_username_available',
    { candidate: normalizedUsername },
  );

  if (availabilityError) throw availabilityError;
  if (!isAvailable) throw new Error('That username is already taken.');

  const authPayload: Record<string, string | null> = {
    username: normalizedUsername,
    display_name: normalizedDisplayName,
  };

  const { data, error } = await supabase.auth.signUp({
    email: getInternalAuthIdentifier(normalizedUsername),
    password,
    options: {
      data: authPayload,
    },
  });

  if (error) throw error;
  return data;
}

export function getFriendlyAuthError(error: unknown) {
  if (error instanceof Error && error.message === 'That username is already taken.') {
    return error.message;
  }

  const authError = error as Partial<AuthError>;
  const message = authError.message?.toLowerCase() ?? '';

  if (message.includes('invalid login credentials')) {
    return 'That username and password combination didn’t work.';
  }

  if (message.includes('password')) {
    return 'Use a stronger password with at least 8 characters.';
  }

  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'That username is already taken.';
  }

  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    authError.status === 429
  ) {
    return 'Too many attempts. Please try again in a moment.';
  }

  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'We couldn’t reach BeerMe. Check your connection and try again.';
  }

  return 'Something went wrong. Please try again in a moment.';
}
