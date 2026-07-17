import { describe, expect, it, vi } from 'vitest';

import { getSafeNextPath, restoreStoredRedirect } from '../../utils/redirect';

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

describe('restoreStoredRedirect', () => {
  const origin = 'https://beerme.christopherbrown.ai';

  it('consumes and restores a valid Pages deep link', () => {
    const storage = {
      getItem: vi.fn(() => '/join/invite?from=qr'),
      removeItem: vi.fn(),
    };
    const history = { replaceState: vi.fn() };

    restoreStoredRedirect(storage, history, origin);

    expect(storage.removeItem).toHaveBeenCalledWith('beerme:redirect');
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/join/invite?from=qr');
  });

  it('replaces an unsafe stored authority with the app root', () => {
    const storage = {
      getItem: vi.fn(() => '//example.com/steal'),
      removeItem: vi.fn(),
    };
    const history = { replaceState: vi.fn() };

    restoreStoredRedirect(storage, history, origin);

    expect(storage.removeItem).toHaveBeenCalledWith('beerme:redirect');
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
  });

  it('leaves history alone when there is no stored redirect', () => {
    const storage = { getItem: vi.fn(() => null), removeItem: vi.fn() };
    const history = { replaceState: vi.fn() };

    restoreStoredRedirect(storage, history, origin);

    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(history.replaceState).not.toHaveBeenCalled();
  });
});
