# Security checks and exception policy

BeerMe runs security checks in the same CI workflow that produces the deployable Pages artifact.
The production build cannot start unless the dependency audit, secret scan, and CodeQL analysis
have passed.

## Automated gates

- **Dependency audit:** `npm run security:audit` blocks high and critical npm findings.
- **Dependency review:** pull requests fail when a changed dependency introduces a high or critical
  vulnerability.
- **CodeQL:** JavaScript and TypeScript are analyzed on every push and pull request.
- **Secret scanning:** Gitleaks scans repository history. Its narrow allowlist covers only the
  documented fake Supabase placeholders, the reserved `.invalid` internal auth domain, and the
  fixed RFC 4122 example UUID used as an invite-token test fixture.
- **Update policy:** Dependabot checks npm and pinned GitHub Actions every Monday. Routine npm
  minor/patch releases are grouped into at most one open pull request, and Actions updates are
  grouped into at most one more. npm security updates remain enabled and are grouped separately so
  routine maintenance cannot crowd them out. Breaking major upgrades are planned explicitly rather
  than opened automatically.
- **Immutable Actions:** every workflow Action is pinned to a full commit SHA. Version comments are
  maintained for Dependabot and human review.

## Protected main branch

The repository-side protection rule for `main` requires every change to arrive through a pull
request whose branch is current with `main`. The `quality`, `e2e`, `database`, `security`, `codeql`,
and `dependency-review` checks must pass, and review conversations must be resolved. The rule also
applies to administrators and disallows force pushes and branch deletion.

The approval count is intentionally zero because this is currently a single-maintainer repository;
the pull request and automated checks remain mandatory without making the maintainer approve their
own work. Raise the approval count when another regular reviewer is available.

## Ownership

The repository maintainer (`@christopherrbrown3`) owns the security policy, scanner configuration,
and initial finding triage. Every exception also names one accountable owner; that owner is
responsible for the linked remediation work and removing the exception before it expires.

## Time-bounded exceptions

Fixing or upgrading is the default. When that is temporarily impossible, add an entry to
`.github/security-exceptions.json` in the same pull request that documents the risk. Every entry
must include:

```json
{
  "id": "SEC-YYYY-NNN",
  "tool": "npm-audit",
  "finding": "GHSA-xxxx-xxxx-xxxx",
  "owner": "@github-handle",
  "rationale": "Why the risk is accepted and how exposure is limited.",
  "expires": "YYYY-MM-DD"
}
```

The `finding` may be a GHSA URL, GHSA identifier, npm advisory source number, or affected package
name reported by npm. Package-level exceptions should be a last resort because they cover every
blocking advisory for that package. CI rejects incomplete, duplicate, malformed, or expired
exceptions. An exception pull request must link a remediation issue and receive security-owner
review. Remove the entry as soon as the finding is fixed.

Secret-scan and CodeQL exceptions belong in their native GitHub dismissal workflows so the audit
trail records who dismissed the finding and why. Dismissals must use the same ownership, rationale,
remediation issue, and expiry requirements. Never add a broad path or rule exclusion to silence a
real credential.
