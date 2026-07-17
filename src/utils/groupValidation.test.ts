import { describe, expect, it } from 'vitest';

import {
  extractInviteToken,
  isUuid,
  normalizeCurrencyValue,
  normalizeGroupDescription,
  normalizeGroupName,
  validateGroupDescription,
  validateGroupName,
  validateCurrencyName,
  validateCurrencySymbol,
} from './groupValidation';

describe('group validation', () => {
  it('normalizes group text', () => {
    expect(normalizeGroupName('  Friday Crew  ')).toBe('Friday Crew');
    expect(normalizeGroupDescription('  Around the corner  ')).toBe('Around the corner');
    expect(normalizeGroupDescription('   ')).toBeNull();
  });

  it('enforces database-compatible lengths', () => {
    expect(validateGroupName('')).toBeTruthy();
    expect(validateGroupName('a'.repeat(61))).toBeTruthy();
    expect(validateGroupName('Friday Crew')).toBeNull();
    expect(validateGroupDescription('a'.repeat(281))).toBeTruthy();
    expect(validateGroupDescription('Neighborhood regulars')).toBeNull();
  });

  it('extracts tokens from links and raw input', () => {
    const token = '123e4567-e89b-42d3-a456-426614174000';
    expect(extractInviteToken(`https://beerme.christopherbrown.ai/join/${token}`)).toBe(token);
    expect(extractInviteToken(token)).toBe(token);
    expect(isUuid(token)).toBe(true);
    expect(isUuid('not-an-invite')).toBe(false);
  });

  it('validates group currency labels', () => {
    expect(normalizeCurrencyValue('  Coffee  ')).toBe('Coffee');
    expect(validateCurrencyName('Coffee', 'Singular name')).toBeNull();
    expect(validateCurrencySymbol('☕')).toBeNull();
    expect(validateCurrencyName(' ', 'Plural name')).toBe(
      'Plural name must be between 1 and 30 characters.',
    );
    expect(validateCurrencySymbol('1234567890123')).toBe(
      'Symbol must be between 1 and 12 characters.',
    );
  });
});
