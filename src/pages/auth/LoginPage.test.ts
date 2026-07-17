import { describe, expect, it } from 'vitest';

import { getSafeNextPath } from '../../utils/redirect';

describe('getSafeNextPath', () => {
  const origin = 'https://beerme.christopherbrown.ai';

  it('keeps a normalized same-origin path, query, and fragment', () => {
    expect(getSafeNextPath('/join/invite?from=friend#ready', origin)).toBe(
      '/join/invite?from=friend#ready',
    );
  });

  it.each([
    ['absolute external URL', 'https://example.com/'],
    ['protocol-relative URL', '//example.com/'],
    ['backslash authority form', '/\\example.com/'],
    ['non-path value', 'activity'],
    ['missing value', null],
  ])('rejects an %s', (_label, value) => {
    expect(getSafeNextPath(value, origin)).toBe('/');
  });
});
