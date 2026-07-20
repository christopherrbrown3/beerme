import { describe, expect, it } from 'vitest';

import {
  getDisplayName,
  normalizeDisplayName,
  normalizeUsername,
  validateDisplayName,
  validateUsername,
} from './profileValidation';

describe('profile validation', () => {
  it('normalizes usernames before persistence', () => {
    expect(normalizeUsername('  Chris_Brown3 ')).toBe('chris_brown3');
  });

  it.each(['ab', 'spaces are bad', 'hyphens-no', 'a'.repeat(25)])(
    'rejects invalid username %s',
    (username) => {
      expect(validateUsername(username)).toBeTruthy();
    },
  );

  it.each(['alex', 'friend_42', 'abc'])('accepts valid username %s', (username) => {
    expect(validateUsername(username)).toBeNull();
  });

  it('trims and validates display names', () => {
    expect(normalizeDisplayName('  Alex Smith  ')).toBe('Alex Smith');
    expect(validateDisplayName('')).toBeNull();
    expect(validateDisplayName('a'.repeat(51))).toBeTruthy();
    expect(validateDisplayName('Alex Smith')).toBeNull();
  });

  it('returns username when display name is blank or null', () => {
    expect(getDisplayName('', 'alex')).toBe('alex');
    expect(getDisplayName(null, 'alex')).toBe('alex');
    expect(getDisplayName('   ', 'alex')).toBe('alex');
  });
});
