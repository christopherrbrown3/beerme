# Production database deployments

BeerMe deploys production Supabase migrations through the manually dispatched
`Deploy Supabase migrations` GitHub Actions workflow. Do not run production SQL from the
Supabase Dashboard, an agent, a local shell, or an arbitrary pull-request branch.

The workflow preserves the timestamped migrations under `supabase/migrations/`, creates and
uploads a recoverable encrypted snapshot before the first database write, performs a dry run, and
verifies both migration alignment and the ownership-transfer API surface afterward.

## One-time GitHub configuration

Create an environment named `supabase-production` with:

- Required reviewer approval before each job starts.
- Deployment restricted to the protected `main` branch.
- `SUPABASE_ACCESS_TOKEN`, containing a narrowly owned Supabase personal access token.
- `SUPABASE_DB_PASSWORD`, containing the production database password.
- `SUPABASE_BACKUP_PASSPHRASE`, containing a strong independent passphrase retained in the
  operator’s password manager.

The repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` remain
browser-safe and are used only for the anonymous post-deploy API check. Never add a service-role
key, secret API key, database connection string, or production credential to a `VITE_*` variable.

## Deploying a migration

1. Merge a pull request containing reviewed migrations only after `quality`, `e2e`, `database`,
   `security`, `codeql`, and `dependency-review` pass.
2. Open **Actions → Deploy Supabase migrations → Run workflow** on `main`.
3. Enter `DEPLOY flfwhplxetsgutekcfyn` and a concise deployment reason.
4. Review the pending environment deployment and approve it.
5. Confirm that the workflow:
   - lists the pre-deploy migration state;
   - dumps roles, schema, and data;
   - encrypts the snapshot with AES-256 and uploads it with seven-day retention;
   - completes `supabase db push --dry-run`;
   - applies the repository migrations;
   - reports aligned migration history;
   - proves PostgREST resolves `group_owner_transfers` while denying anonymous access.
6. Run the affected authenticated product journey after deployment. For ownership transfer,
   verify an existing group and a newly created group, then load Activity after a hard refresh and
   a fresh login.

The deployment is incomplete if the encrypted snapshot artifact is absent, empty, or uploaded
after `db push`. Do not bypass a failed snapshot step.

## Recovering the snapshot

Prefer a forward fix when production remains readable and user writes have continued. Restoring a
whole snapshot discards data written after its capture and is an incident-level action.

For recovery:

1. Stop new writes and record the incident time.
2. Download `beerme-production-snapshot-<run-id>` from the deployment run.
3. Verify its SHA-256 value against the workflow summary.
4. Retrieve `SUPABASE_BACKUP_PASSPHRASE` from the operator password manager.
5. Decrypt and unpack in a private temporary directory:

   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
     -pass env:SUPABASE_BACKUP_PASSPHRASE \
     -in beerme-production-snapshot-<run-id>.tar.gz.enc \
     -out beerme-production-snapshot.tar.gz
   tar -xzf beerme-production-snapshot.tar.gz
   ```

6. Restore into a separate Supabase project first and verify profiles, groups, memberships,
   transactions, authorization, and balance invariants.
7. Restore production only after explicitly accepting the post-snapshot data-loss window and
   recording the rollback decision.
8. Securely remove decrypted files after verification.

Supabase-managed physical backups or Point-in-Time Recovery remain the preferred whole-project
disaster-recovery mechanism when the project plan provides them. The workflow snapshot is the
mandatory immediate rollback checkpoint for every BeerMe migration deployment.

## Failed deployments

- A failure before `Apply migrations` leaves production unchanged.
- A failure during `db push` must be treated as unknown until migration history and affected
  objects are inspected.
- Never mark a migration as applied merely to clear an error. Verify that its tables, constraints,
  policies, grants, and functions exist first.
- Do not retry blindly. Preserve the run logs, migration list, snapshot checksum, and PostgREST
  response status, then diagnose the exact failed migration.
