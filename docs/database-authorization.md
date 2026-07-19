# Database authorization audit

Status: audited at `df577cb5de1385f923242dd8eec379f940889e0d`  
Scope: migrations through `20260717080000`, direct PostgREST/RPC clients, and Realtime publication  
Security model: [BeerMe threat model](threat-model.md)

BeerMe has no trusted application server. A modified browser can call every API path exposed by
Supabase, so PostgreSQL grants, Row Level Security (RLS), constraints, triggers, and authenticated
RPCs are the authorization boundary. Client-side roles, hidden controls, and supplied user IDs are
never authority.

## Public object inventory

| Object                   | Client grant                                                      | RLS or exposure decision                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.profiles`        | Authenticated `SELECT`; `UPDATE(display_name)`                    | RLS permits self, current group peers, and profiles needed to interpret retained history. Self-update is enforced by both `USING` and `WITH CHECK`.                                 |
| `public.groups`          | Authenticated `SELECT`, `INSERT`; column-limited settings updates | RLS permits current members to read, the caller to create only a self-owned group, and only the owner to update. The creation trigger adds the matching owner membership.           |
| `public.memberships`     | Authenticated `SELECT`                                            | RLS permits current members of the same group. Inserts and deletes are restricted to trusted triggers/RPCs.                                                                         |
| `public.transactions`    | Authenticated `SELECT`; column-limited `INSERT`                   | RLS permits current group members. Inserts require the caller, debtor, and creditor to be current members and force `created_by = auth.uid()`. Direct update/delete is not granted. |
| `public.membership_role` | Used by authenticated table/RPC results                           | Enum values are data labels, not authorization; role changes are not directly granted.                                                                                              |

There are no BeerMe-owned public views or sequences. `private` is not an exposed PostgREST schema;
authenticated schema usage and helper execution exist only so RLS policies can evaluate their
boolean predicates.

## Function and trigger inventory

| Function                                                                                          | Invocation                      | Authentication and authorization                                                                                                                             | Output                                                              |
| ------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `public.is_username_available(text)`                                                              | Anonymous and authenticated RPC | Intentionally public; validates normalized format and reveals only availability. Enumeration controls remain tracked in #46.                                 | Boolean only.                                                       |
| `public.join_group(uuid)`                                                                         | Authenticated RPC               | Rejects a null `auth.uid()`, resolves only the bearer token, inserts `auth.uid()` with fixed `member` role, and is idempotent.                               | Token-selected group UUID for navigation.                           |
| `public.reverse_transaction(uuid)`                                                                | Authenticated RPC               | Rejects a null identity, locks the row, requires current membership and creator-or-owner authority, and derives reversal actor/time in PostgreSQL.           | Authorized transaction row; the caller already has RLS read access. |
| `public.leave_group(uuid)`                                                                        | Authenticated RPC               | Locks only the caller's membership, rejects missing membership and owner departure, and deletes only `auth.uid()`.                                           | `void`.                                                             |
| `public.delete_group(uuid)`                                                                       | Authenticated RPC               | Locks the group, compares the database owner to `auth.uid()`, scopes the transaction-local deletion guard to that group, then cascades deletion.             | `void`.                                                             |
| `public.handle_new_user()`                                                                        | Auth trigger only               | Execution revoked from public API roles; validates Auth metadata before inserting a fully qualified profile row.                                             | Trigger row.                                                        |
| `private.is_group_member`, `private.shares_group_with`, `private.shares_transaction_history_with` | RLS helper                      | Derive the current identity from `auth.uid()` and return only boolean policy predicates.                                                                     | Boolean only.                                                       |
| `private.add_group_owner_membership()`                                                            | Group creation trigger only     | Execution revoked from public API roles; uses the already RLS-authorized inserted owner.                                                                     | Trigger row.                                                        |
| `private.protect_transaction_history()`                                                           | Transaction trigger only        | Execution revoked from public API roles; rejects deletion outside an owner-authorized group cascade and rejects every mutation except one complete reversal. | Trigger row.                                                        |

Every BeerMe function pins an empty `search_path` and fully qualifies database objects. PostgreSQL
owns the tables and functions. The automated schema contract fails if an object, policy, grant,
trigger, publication, owner, or function execution path changes without an explicit audit decision.

## Adversarial behavior covered

The pgTAP suite creates disposable Auth identities and rolls every fixture back. It switches the
database role and JWT subject directly, exercising the same grants/RLS/RPC boundary used by
PostgREST rather than relying on UI visibility.

- Owner: own-group read/settings/reversal/delete authority; unrelated-group denial.
- Member: same-group reads and valid writes; creator spoofing, outsider parties, owner settings,
  and unauthorized reversal denied.
- Former member: group, membership, ledger, and peer-profile access revoked; remaining members can
  still interpret the former member's retained ledger attribution.
- Stranger: unrelated groups, memberships, and transactions hidden; a valid invite can add only the
  token-selected group with fixed member role.
- Anonymous: table access and authenticated RPC execution denied; username availability remains the
  sole intentional anonymous RPC.
- Concurrent operations: reversal, leave, and deletion functions are contract-tested to retain the
  row locks that serialize mutable authorization state; uniqueness, foreign keys, and the immutable
  ledger trigger preserve the final state when PostgreSQL aborts a competing transaction.

Run the isolated database gate with:

```sh
supabase db start
supabase test db
```

GitHub Actions starts a disposable local Supabase database and runs the same tests for every push
and pull request. Production drift is not inferred from repository tests: deployment verification
must compare the live migration revision, grants, RLS, function definitions, Auth settings, and
Realtime publication with this contract.

## Findings and follow-up

The audit did not find a cross-tenant table or RPC authorization bypass. Supabase Postgres Changes
does not apply RLS to `DELETE` events, while BeerMe currently publishes tenant-keyed tables and
listens globally. The resulting primary-key-only metadata disclosure was calibrated as
non-reportable because UUIDs are not capabilities and no protected row content becomes readable.
The separate cross-client refetch-amplification risk is **Low / P3** and is tracked by #39, whose
Realtime-removal scope must add relevance filtering or coalescing. Until that work lands,
focus/refetch remains defense in depth rather than proof that DELETE delivery is tenant-scoped.

Existing accepted risks remain owned by #40, #46, and #69–#73. They are not authorization
counterexamples for this audit and must be closed according to the threat model's review dates.
