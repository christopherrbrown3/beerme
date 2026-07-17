import { describe, expect, it } from 'vitest';

import { getFriendlyAuthError } from './authService';

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
