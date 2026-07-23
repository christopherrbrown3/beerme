import { spawnSync } from 'node:child_process';

import { readLocalSupabaseEnvironment } from './local-supabase-env.mjs';

let environment;
try {
  environment = readLocalSupabaseEnvironment();
} catch {
  console.error('Local Supabase is unavailable. Start it with `npx supabase start`, then retry.');
  process.exit(1);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, ['playwright', 'test', ...process.argv.slice(2)], {
  env: { ...process.env, ...environment },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
