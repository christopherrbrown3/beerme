import { describe, expect, it, vi } from 'vitest';

import { DATABASE_PAGE_SIZE, fetchAllPages } from './pagination';

describe('fetchAllPages', () => {
  it('collects every page with inclusive database ranges', async () => {
    const rows = Array.from({ length: DATABASE_PAGE_SIZE * 2 + 5 }, (_, index) => index);
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));

    await expect(fetchAllPages(fetchPage)).resolves.toEqual(rows);
    expect(fetchPage.mock.calls).toEqual([
      [0, 999],
      [1_000, 1_999],
      [2_000, 2_999],
    ]);
  });

  it('requests an empty sentinel page for an exact page multiple', async () => {
    const rows = Array.from({ length: DATABASE_PAGE_SIZE }, (_, index) => index);
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));

    await expect(fetchAllPages(fetchPage)).resolves.toEqual(rows);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('stops and propagates a page failure', async () => {
    const pageError = new Error('page unavailable');
    const fetchPage = vi
      .fn<(from: number, to: number) => Promise<{ data: number[]; error: Error | null }>>()
      .mockResolvedValueOnce({
        data: Array.from({ length: DATABASE_PAGE_SIZE }, (_, index) => index),
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: pageError });

    await expect(fetchAllPages(fetchPage)).rejects.toBe(pageError);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
