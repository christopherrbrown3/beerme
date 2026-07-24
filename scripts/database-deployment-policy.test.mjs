// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { validateDatabaseDeploymentPolicy } from './database-deployment-policy.mjs';

const workflow = readFileSync(
  new URL('../.github/workflows/deploy-supabase.yml', import.meta.url),
  'utf8',
);

describe('production database deployment policy', () => {
  it('accepts the repository workflow', () => {
    expect(() => validateDatabaseDeploymentPolicy(workflow)).not.toThrow();
  });

  it('rejects automatic production deployments', () => {
    const automaticWorkflow = workflow.replace(
      '  workflow_dispatch:',
      "  push:\n    branches: ['main']\n  workflow_dispatch:",
    );

    expect(() => validateDatabaseDeploymentPolicy(automaticWorkflow)).toThrow('must remain manual');
  });

  it('rejects migrations that run before the snapshot upload', () => {
    const unsafeWorkflow = workflow.replace(
      'name: Apply migrations',
      'name: Run schema deployment',
    );

    expect(() => validateDatabaseDeploymentPolicy(unsafeWorkflow)).toThrow(
      'snapshot must be uploaded before migrations',
    );
  });

  it('rejects service-role credentials', () => {
    expect(() =>
      validateDatabaseDeploymentPolicy(`${workflow}\n# SUPABASE_SERVICE_ROLE_KEY`),
    ).toThrow('must not use a service-role credential');
  });
});
