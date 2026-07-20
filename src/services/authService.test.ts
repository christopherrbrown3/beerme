import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getFriendlyAuthError,
  getInternalAuthIdentifier,
  signInWithPassword,
  signUpWithPassword,
} from './authService';

const authClient = vi.hoisted(() => ({
  rpc: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc: authClient.rpc,
    auth: {
      signInWithPassword: authClient.signInWithPassword,
      signUp: authClient.signUp,
    },
  }),
}));

describe('signUpWithPassword', () => {
  beforeEach(() => {
    authClient.rpc.mockReset();
    authClient.signInWithPassword.mockReset();
    authClient.signUp.mockReset();
    authClient.rpc.mockResolvedValue({ data: true, error: null });
    authClient.signUp.mockResolvedValue({ data: { user: {}, session: null }, error: null });
  });

  it('creates an account with a non-deliverable username identifier', async () => {
    await signUpWithPassword({
      password: 'long-enough-password',
      username: ' Friend_1 ',
      displayName: ' Friendly Person ',
    });

    expect(authClient.signUp).toHaveBeenCalledWith({
      email: 'friend_1@users.beerme.invalid',
      password: 'long-enough-password',
      options: {
        data: { username: 'friend_1', display_name: 'Friendly Person' },
      },
    });
  });

  it('creates an account without a display name on the nullable profile schema', async () => {
    await signUpWithPassword({
      password: 'long-enough-password',
      username: ' Friend_1 ',
      displayName: '   ',
    });

    expect(authClient.signUp).toHaveBeenCalledOnce();
    expect(authClient.signUp).toHaveBeenCalledWith({
      email: 'friend_1@users.beerme.invalid',
      password: 'long-enough-password',
      options: {
        data: { username: 'friend_1', display_name: null },
      },
    });
  });

  it('retries username-only signup for a legacy non-null profile schema', async () => {
    authClient.signUp
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Database error saving new user' },
      })
      .mockResolvedValueOnce({ data: { user: {}, session: null }, error: null });

    await signUpWithPassword({
      password: 'long-enough-password',
      username: ' Friend_1 ',
    });

    expect(authClient.signUp).toHaveBeenCalledTimes(2);
    expect(authClient.signUp).toHaveBeenLastCalledWith({
      email: 'friend_1@users.beerme.invalid',
      password: 'long-enough-password',
      options: {
        data: { username: 'friend_1', display_name: 'friend_1' },
      },
    });
  });

  it('does not retry unrelated signup errors', async () => {
    const error = { message: 'Password should be at least 8 characters' };
    authClient.signUp.mockResolvedValue({ data: { user: null, session: null }, error });

    await expect(
      signUpWithPassword({
        password: 'short',
        username: 'friend_1',
      }),
    ).rejects.toBe(error);

    expect(authClient.signUp).toHaveBeenCalledOnce();
  });

  it('uses the same normalized identifier for login', async () => {
    authClient.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    await signInWithPassword(' FRIEND_1 ', 'long-enough-password');

    expect(getInternalAuthIdentifier(' FRIEND_1 ')).toBe('friend_1@users.beerme.invalid');
    expect(authClient.signInWithPassword).toHaveBeenCalledWith({
      email: 'friend_1@users.beerme.invalid',
      password: 'long-enough-password',
    });
  });
});

describe('getFriendlyAuthError', () => {
  it('preserves local username conflicts', () => {
    expect(getFriendlyAuthError(new Error('That username is already taken.'))).toBe(
      'That username is already taken.',
    );
  });

  it('explains provider rate limits without mentioning delivery', () => {
    expect(getFriendlyAuthError({ message: 'email rate limit exceeded', status: 429 })).toBe(
      'Too many attempts. Please try again in a moment.',
    );
    expect(getFriendlyAuthError({ message: 'Too many requests', status: 429 })).toBe(
      'Too many attempts. Please try again in a moment.',
    );
  });

  it('distinguishes network errors from provider errors', () => {
    expect(getFriendlyAuthError(new TypeError('Failed to fetch'))).toBe(
      'We couldn’t reach BeerMe. Check your connection and try again.',
    );
  });

  it('keeps existing login and password guidance', () => {
    expect(getFriendlyAuthError({ message: 'Invalid login credentials' })).toBe(
      'That username and password combination didn’t work.',
    );
    expect(getFriendlyAuthError({ message: 'Password should be at least 8 characters' })).toBe(
      'Use a stronger password with at least 8 characters.',
    );
  });

  it('explains profile-storage failures', () => {
    expect(getFriendlyAuthError({ message: 'Database error saving new user' })).toBe(
      'We couldn’t finish creating your profile. Please try again in a moment.',
    );
  });
});
