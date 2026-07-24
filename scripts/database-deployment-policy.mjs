import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const WORKFLOW_URL = new URL('../.github/workflows/deploy-supabase.yml', import.meta.url);

export function validateDatabaseDeploymentPolicy(source) {
  const requirements = [
    ['manual workflow trigger', 'workflow_dispatch:'],
    ['production environment', 'name: supabase-production'],
    ['main-branch guard', "if: github.ref == 'refs/heads/main'"],
    ['non-canceling deployment lock', 'cancel-in-progress: false'],
    ['access-token secret', 'secrets.SUPABASE_ACCESS_TOKEN'],
    ['database-password secret', 'secrets.SUPABASE_DB_PASSWORD'],
    ['backup-encryption secret', 'secrets.SUPABASE_BACKUP_PASSPHRASE'],
    ['role snapshot', '--role-only'],
    ['data snapshot', '--data-only'],
    ['snapshot encryption', '-aes-256-cbc'],
    ['migration dry run', 'supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --dry-run'],
    [
      'tracked migration deployment',
      'supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --yes',
    ],
    ['post-deploy API check', 'Verify ownership-transfer API schema'],
  ];

  for (const [description, expected] of requirements) {
    if (!source.includes(expected)) {
      throw new Error(`Production database workflow is missing ${description}.`);
    }
  }

  if (/^  (push|pull_request):/m.test(source)) {
    throw new Error('Production database deployment must remain manual.');
  }

  if (/service[_-]?role/i.test(source)) {
    throw new Error('Production database workflow must not use a service-role credential.');
  }

  const snapshotIndex = source.indexOf('name: Create encrypted production snapshot');
  const uploadIndex = source.indexOf('name: Upload encrypted snapshot');
  const deployIndex = source.indexOf('name: Apply migrations');

  if (!(snapshotIndex < uploadIndex && uploadIndex < deployIndex)) {
    throw new Error('A verified snapshot must be uploaded before migrations are applied.');
  }
}

export function runDatabaseDeploymentPolicy() {
  validateDatabaseDeploymentPolicy(readFileSync(WORKFLOW_URL, 'utf8'));
  console.log('Production database deployment policy passed.');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    runDatabaseDeploymentPolicy();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
