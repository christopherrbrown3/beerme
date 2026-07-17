import { describe, expect, it } from 'vitest';

import { formatFriendlyTimestamp } from './date';

describe('formatFriendlyTimestamp', () => {
  const now = new Date('2026-07-17T12:00:00.000Z').getTime();

  it('formats recent activity relatively', () => {
    expect(formatFriendlyTimestamp('2026-07-17T11:59:30.000Z', now)).toBe('30 seconds ago');
    expect(formatFriendlyTimestamp('2026-07-17T11:45:00.000Z', now)).toBe('15 minutes ago');
    expect(formatFriendlyTimestamp('2026-07-16T12:00:00.000Z', now)).toBe('yesterday');
  });

  it('uses a compact calendar date for older activity', () => {
    expect(formatFriendlyTimestamp('2026-07-01T12:00:00.000Z', now)).toBe('Jul 1');
    expect(formatFriendlyTimestamp('2025-12-01T12:00:00.000Z', now)).toBe('Dec 1, 2025');
  });

  it('returns an empty string for invalid timestamps', () => {
    expect(formatFriendlyTimestamp('not-a-date', now)).toBe('');
  });
});
