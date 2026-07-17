import { type AuthError } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabase';
import { normalizeDisplayName, normalizeUsername } from '../utils/profileValidation';

export type SignUpInput = {
  email: string;
  password: string;
  username: string;
  displayName: string;
};

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUpWithPassword({ email, password, username, displayName }: SignUpInput) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const supabase = getSupabaseClient();

  const { data: isAvailable, error: availabilityError } = await supabase.rpc(
    'is_username_available',
    { candidate: normalizedUsername },
  );

  if (availabilityError) throw availabilityError;
  if (!isAvailable) throw new Error('That username is already taken.');

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        username: normalizedUsername,
        display_name: normalizedDisplayName,
      },
      emailRedirectTo: `${window.location.origin}/`,
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
    return 'That email and password combination didn’t work.';
  }

  if (message.includes('email not confirmed')) {
    return 'Check your inbox and confirm your email before signing in.';
  }

  if (message.includes('password')) {
    return 'Use a stronger password with at least 8 characters.';
  }

  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account already exists for that email.';
  }

  return 'Something went wrong. Please try again in a moment.';
}
