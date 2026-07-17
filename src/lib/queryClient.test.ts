import { describe, expect, it } from 'vitest';

import { createAppQueryClient } from './queryClient';

describe('app QueryClient defaults', () => {
  it('refreshes stale data after focus while preserving the freshness window', () => {
    const options = createAppQueryClient().getDefaultOptions().queries;

    expect(options).toMatchObject({
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    });
  });
});
