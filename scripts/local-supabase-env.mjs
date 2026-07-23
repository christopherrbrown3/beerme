import { execFileSync } from 'node:child_process';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function requiredStatusValue(status, ...keys) {
  const value = keys.map((key) => status[key]).find((candidate) => typeof candidate === 'string');
  if (!value || value.includes('\n') || value.includes('\r')) {
    throw new Error(`Local Supabase status is missing ${keys[0]}.`);
  }
  return value;
}

export function parseLocalSupabaseStatus(input) {
  const status = typeof input === 'string' ? JSON.parse(input) : input;
  if (!status || typeof status !== 'object' || Array.isArray(status)) {
    throw new Error('Local Supabase status must be a JSON object.');
  }

  const apiUrl = requiredStatusValue(status, 'API_URL', 'api_url');
  const parsedUrl = new URL(apiUrl);
  if (!LOOPBACK_HOSTS.has(parsedUrl.hostname)) {
    throw new Error('Browser integration tests may only target loopback Supabase instances.');
  }

  return {
    VITE_SUPABASE_URL: apiUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: requiredStatusValue(status, 'ANON_KEY', 'anon_key'),
    SUPABASE_SERVICE_ROLE_KEY: requiredStatusValue(status, 'SERVICE_ROLE_KEY', 'service_role_key'),
    E2E_LOCAL_SUPABASE: 'true',
  };
}

export function readLocalSupabaseEnvironment() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const status = execFileSync(npx, ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return parseLocalSupabaseStatus(status);
}
