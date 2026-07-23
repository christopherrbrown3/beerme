import { appendFileSync } from 'node:fs';

import { readLocalSupabaseEnvironment } from './local-supabase-env.mjs';

const githubEnvironmentFile = process.env.GITHUB_ENV;
if (!githubEnvironmentFile) {
  throw new Error('GITHUB_ENV is required when exporting the browser test environment.');
}

const environment = readLocalSupabaseEnvironment();
const entries = Object.entries(environment).map(([key, value]) => `${key}=${value}`);
appendFileSync(githubEnvironmentFile, `${entries.join('\n')}\n`, { encoding: 'utf8' });
console.log('Configured browser tests for the isolated loopback Supabase stack.');
