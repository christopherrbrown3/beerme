import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));

describe('supabase client configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'public-key';
  });

  it('configures detectSessionInUrl as false', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const { getSupabaseClient } = await import('./supabase');

    const client = getSupabaseClient();

    expect(client).toEqual({ auth: {} });
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'public-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        }),
      }),
    );
  });
});
