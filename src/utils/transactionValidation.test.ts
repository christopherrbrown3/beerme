import { describe, expect, it } from 'vitest';

import {
  normalizeTransactionNote,
  validateTransactionNote,
  validateTransactionParties,
  validateTransactionQuantity,
} from './transactionValidation';

describe('transaction validation', () => {
  it('requires two different people', () => {
    expect(validateTransactionParties('', 'friend-2')).toBe('Choose both people.');
    expect(validateTransactionParties('friend-1', 'friend-1')).toBe('Choose two different people.');
    expect(validateTransactionParties('friend-1', 'friend-2')).toBeNull();
  });

  it('accepts only whole quantities from 1 through 99', () => {
    expect(validateTransactionQuantity(1)).toBeNull();
    expect(validateTransactionQuantity(99)).toBeNull();
    expect(validateTransactionQuantity(0)).not.toBeNull();
    expect(validateTransactionQuantity(100)).not.toBeNull();
    expect(validateTransactionQuantity(1.5)).not.toBeNull();
  });

  it('normalizes empty notes and enforces the note limit', () => {
    expect(normalizeTransactionNote('   ')).toBeNull();
    expect(normalizeTransactionNote('  Trivia night  ')).toBe('Trivia night');
    expect(validateTransactionNote('x'.repeat(280))).toBeNull();
    expect(validateTransactionNote('x'.repeat(281))).not.toBeNull();
  });
});
