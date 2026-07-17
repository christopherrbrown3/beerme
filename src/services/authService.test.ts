import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getFriendlyAuthError, signUpWithPassword } from './authService';

const authClient = vi.hoisted(() => ({
  rpc: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc: authClient.rpc,
    auth: { signUp: authClient.signUp },
  }),
}));

describe('signUpWithPassword', () => {
  beforeEach(() => {
    authClient.rpc.mockReset();
    authClient.signUp.mockReset();
    authClient.rpc.mockResolvedValue({ data: true, error: null });
    authClient.signUp.mockResolvedValue({ data: { user: {}, session: null }, error: null });
  });

  it('carries a safe invite destination into the confirmation callback', async () => {
    await signUpWithPassword({
      email: ' friend@example.com ',
      password: 'long-enough-password',
      username: ' Friend_1 ',
      displayName: ' Friendly Person ',
      nextPath: '/join/123e4567-e89b-42d3-a456-426614174000',
    });

    expect(authClient.signUp).toHaveBeenCalledWith({
      email: 'friend@example.com',
      password: 'long-enough-password',
      options: {
        data: { username: 'friend_1', display_name: 'Friendly Person' },
        emailRedirectTo:
          'http://localhost:3000/auth/login?next=%2Fjoin%2F123e4567-e89b-42d3-a456-426614174000',
      },
    });
  });

  it('cannot embed an external confirmation destination', async () => {
    await signUpWithPassword({
      email: 'friend@example.com',
      password: 'long-enough-password',
      username: 'friend_1',
      displayName: 'Friendly Person',
      nextPath: '//example.com/steal',
    });

    expect(authClient.signUp.mock.calls[0]?.[0].options.emailRedirectTo).toBe(
      'http://localhost:3000/auth/login?next=%2F',
    );
  });
});

describe('getFriendlyAuthError', () => {
  it('preserves local username conflicts', () => {
    expect(getFriendlyAuthError(new Error('That username is already taken.'))).toBe(
      'That username is already taken.',
    );
  });

  it('explains provider email rate limits', () => {
    expect(getFriendlyAuthError({ message: 'email rate limit exceeded', status: 429 })).toBe(
      'BeerMe has sent too many confirmation emails. Please try again later.',
    );
    expect(getFriendlyAuthError({ message: 'Too many requests', status: 429 })).toBe(
      'BeerMe has sent too many confirmation emails. Please try again later.',
    );
  });

  it('explains unauthorized recipients on the default email provider', () => {
    expect(getFriendlyAuthError({ message: 'Email address not authorized' })).toBe(
      'Email delivery is not configured for public signups yet. Please contact the BeerMe owner.',
    );
  });

  it('distinguishes network errors from provider errors', () => {
    expect(getFriendlyAuthError(new TypeError('Failed to fetch'))).toBe(
      'We couldn’t reach BeerMe. Check your connection and try again.',
    );
  });

  it('keeps existing login and password guidance', () => {
    expect(getFriendlyAuthError({ message: 'Invalid login credentials' })).toBe(
      'That email and password combination didn’t work.',
    );
    expect(getFriendlyAuthError({ message: 'Password should be at least 8 characters' })).toBe(
      'Use a stronger password with at least 8 characters.',
    );
  });
});
