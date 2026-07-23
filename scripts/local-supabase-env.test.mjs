import { describe, expect, it } from 'vitest';

import { parseLocalSupabaseStatus } from './local-supabase-env.mjs';

const localStatus = {
  API_URL: 'http://127.0.0.1:54321',
  ANON_KEY: 'local-anon-key',
  SERVICE_ROLE_KEY: 'local-service-role-key',
};

describe('parseLocalSupabaseStatus', () => {
  it('maps loopback credentials into the browser test environment', () => {
    expect(parseLocalSupabaseStatus(localStatus)).toEqual({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'local-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-key',
      E2E_LOCAL_SUPABASE: 'true',
    });
  });

  it('rejects hosted projects before exposing service-role credentials to tests', () => {
    expect(() =>
      parseLocalSupabaseStatus({
        ...localStatus,
        API_URL: 'https://production-project.supabase.co',
      }),
    ).toThrow('only target loopback Supabase instances');
  });

  it('rejects missing and multiline credentials', () => {
    expect(() => parseLocalSupabaseStatus({ ...localStatus, ANON_KEY: '' })).toThrow(
      'missing ANON_KEY',
    );
    expect(() =>
      parseLocalSupabaseStatus({ ...localStatus, SERVICE_ROLE_KEY: 'unsafe\nvalue' }),
    ).toThrow('missing SERVICE_ROLE_KEY');
  });
});
