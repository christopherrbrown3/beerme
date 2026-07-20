begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

select set_eq(
  $$
    select table_name::text
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  $$,
  array['group_owner_transfers', 'groups', 'memberships', 'profiles', 'transactions'],
  'the public table inventory is explicit'
);

select set_eq(
  $$
    select p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  $$,
  array[
    'delete_group(uuid)',
    'handle_new_user()',
    'is_username_available(text)',
    'join_group(uuid)',
    'leave_group(uuid)',
    'reverse_transaction(uuid)',
    'transfer_group_ownership(uuid, uuid)'
  ],
  'the public function inventory is explicit'
);

select set_eq(
  $$
    select p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
  $$,
  array[
    'add_group_owner_membership()',
    'is_group_member(uuid, uuid)',
    'protect_transaction_history()',
    'shares_group_with(uuid)',
    'shares_transaction_history_with(uuid)'
  ],
  'the private helper inventory is explicit'
);

select is(
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
  ),
  5::bigint,
  'RLS is enabled on every public table'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ),
  'anon has no direct public-table privileges'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type in ('DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  'authenticated has no destructive table privileges'
);

select ok(
  not has_table_privilege('authenticated', 'public.memberships', 'INSERT')
    and not has_table_privilege('authenticated', 'public.memberships', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
  'membership and profile creation are not directly client-writable'
);

select ok(
  not has_table_privilege('authenticated', 'public.transactions', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.groups', 'DELETE'),
  'ledger reversal and group deletion require RPCs'
);

select set_eq(
  $$
    select column_name::text
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  $$,
  array['display_name'],
  'profile updates are limited to display_name'
);

select set_eq(
  $$
    select column_name::text
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'groups'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  $$,
  array['currency_name', 'currency_plural', 'currency_symbol', 'description', 'name'],
  'group updates are limited to owner-editable fields'
);

select set_eq(
  $$
    select p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  $$,
  array['is_username_available(text)'],
  'anon can execute only the username availability RPC'
);

select set_eq(
  $$
    select p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  $$,
  array[
    'delete_group(uuid)',
    'is_username_available(text)',
    'join_group(uuid)',
    'leave_group(uuid)',
    'reverse_transaction(uuid)',
    'transfer_group_ownership(uuid, uuid)'
  ],
  'authenticated can execute only intended public RPCs'
);

select set_eq(
  $$
    select p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  $$,
  array[
    'is_group_member(uuid, uuid)',
    'shares_group_with(uuid)',
    'shares_transaction_history_with(uuid)'
  ],
  'authenticated can execute only policy helper functions in private'
);

select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef
  ),
  11::bigint,
  'the security-definer inventory is explicit'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting
        where setting like 'search_path=%'
      )
  ),
  'every BeerMe function pins search_path'
);

select set_eq(
  $$
    select policyname::text
    from pg_policies
    where schemaname = 'public'
  $$,
  array[
    'Members can add valid group transactions',
    'Members can read group owner transfers',
    'Members can read group memberships',
    'Members can read group transactions',
    'Members can read their groups',
    'Owners can update their groups',
    'Users can create groups they own',
    'Users can read relevant profiles',
    'Users can update their own display name'
  ],
  'the RLS policy inventory is explicit'
);

select set_eq(
  $$
    select t.tgname::text
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace function_namespace on function_namespace.oid = p.pronamespace
    where not t.tgisinternal
      and n.nspname in ('auth', 'public')
      and function_namespace.nspname in ('public', 'private')
  $$,
  array['on_auth_user_created', 'on_group_created', 'protect_transaction_history'],
  'the security trigger inventory is explicit'
);

select set_eq(
  $$
    select schemaname || '.' || tablename
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename in ('groups', 'memberships', 'profiles', 'transactions')
  $$,
  array['public.groups', 'public.memberships', 'public.profiles', 'public.transactions'],
  'the Realtime publication inventory is explicit'
);

select ok(
  not exists (
    select 1
    from information_schema.views
    where table_schema = 'public'
  )
    and not exists (
      select 1
      from information_schema.sequences
      where sequence_schema = 'public'
    ),
  'there are no unreviewed public views or sequences'
);

select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_roles r on r.oid = c.relowner
    where n.nspname = 'public' and c.relkind = 'r' and r.rolname <> 'postgres'
  ),
  'postgres owns every public table'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_roles r on r.oid = p.proowner
    where n.nspname in ('public', 'private') and r.rolname <> 'postgres'
  ),
  'postgres owns every BeerMe function'
);

select function_returns(
  'public',
  'is_username_available',
  array['text']::name[],
  'boolean',
  'the anonymous username RPC returns only a boolean'
);

select * from finish();
rollback;
