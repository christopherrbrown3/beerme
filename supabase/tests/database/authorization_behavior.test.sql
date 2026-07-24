begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.throws_sqlstate(command text, expected_state text)
returns boolean
language plpgsql
as $$
begin
  execute command;
  return false;
exception
  when others then
    return sqlstate = expected_state;
end;
$$;

select plan(41);

insert into auth.users (
  id, email, raw_user_meta_data
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'audit_owner@users.beerme.invalid',
    '{"username":"audit_owner","display_name":"Audit Owner"}'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'audit_member@users.beerme.invalid',
    '{"username":"audit_member","display_name":"Audit Member"}'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'audit_former@users.beerme.invalid',
    '{"username":"audit_former","display_name":"Audit Former"}'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'audit_stranger@users.beerme.invalid',
    '{"username":"audit_stranger","display_name":"Audit Stranger"}'
  );

insert into public.groups (id, name, owner_id, invite_token)
values
  (
    '20000000-0000-4000-8000-000000000001', 'Audit Group One',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002', 'Audit Group Two',
    '10000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000002'
  );

insert into public.memberships (group_id, user_id, role)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'member'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    'member'
  );

insert into public.transactions (
  id, group_id, debtor_user_id, creditor_user_id, quantity, note, created_by
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    2, 'Historical attribution fixture',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    1, 'Member reversal fixture',
    '10000000-0000-4000-8000-000000000002'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.groups), 1::bigint, 'owner reads only their group');
select is((select count(*) from public.memberships), 3::bigint, 'owner reads current group memberships');
select is((select count(*) from public.transactions), 2::bigint, 'owner reads current group ledger');
select is((select count(*) from public.profiles), 3::bigint, 'owner reads only relevant profiles');

savepoint transfer_ownership_rpc_test;

select lives_ok(
  $$select public.transfer_group_ownership(
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  )$$,
  'an existing group owner can transfer ownership through the deployed RPC'
);
select is(
  (
    select owner_id
    from public.groups
    where id = '20000000-0000-4000-8000-000000000001'
  ),
  '10000000-0000-4000-8000-000000000002'::uuid,
  'the selected member becomes the group owner'
);
select is(
  (
    select role
    from public.memberships
    where group_id = '20000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000002'
  ),
  'owner'::public.membership_role,
  'the selected member receives the enum owner role'
);
select is(
  (
    select role
    from public.memberships
    where group_id = '20000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000001'
  ),
  'member'::public.membership_role,
  'the previous owner receives the enum member role'
);
select is(
  (
    select count(*)
    from public.group_owner_transfers
    where group_id = '20000000-0000-4000-8000-000000000001'
      and previous_owner_id = '10000000-0000-4000-8000-000000000001'
      and new_owner_id = '10000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'the successful transfer records one history entry'
);

rollback to savepoint transfer_ownership_rpc_test;
release savepoint transfer_ownership_rpc_test;

select results_eq(
  $$
    update public.groups
    set currency_name = 'Favor', currency_plural = 'Favors', currency_symbol = '🤝'
    where id = '20000000-0000-4000-8000-000000000001'
    returning name
  $$,
  array['Audit Group One'],
  'owner can update owner-scoped settings through PostgREST-equivalent DML'
);

select is_empty(
  $$
    update public.groups
    set currency_name = 'Stolen'
    where id = '20000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'owner cannot update an unrelated group'
);

select ok(
  pg_temp.throws_sqlstate(
    $$insert into public.groups (name, owner_id) values ('Spoofed owner', '10000000-0000-4000-8000-000000000002')$$,
    '42501'
  ),
  'a client cannot create a group for another owner'
);

select ok(
  pg_temp.throws_sqlstate(
    $$select public.delete_group('20000000-0000-4000-8000-000000000002')$$,
    '42501'
  ),
  'an owner cannot delete an unrelated group through RPC'
);

select lives_ok(
  $$select public.reverse_transaction('40000000-0000-4000-8000-000000000002')$$,
  'a group owner can reverse a member-created transaction'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is((select count(*) from public.groups), 1::bigint, 'member reads only their current group');
select is((select count(*) from public.transactions), 2::bigint, 'member reads only their current ledger');
select is((select count(*) from public.profiles), 3::bigint, 'member reads current peers but not strangers');

select lives_ok(
  $$
    insert into public.transactions (
      group_id, debtor_user_id, creditor_user_id, quantity, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',
      1,
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  'a member can add a valid same-group transaction'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      insert into public.transactions (
        group_id, debtor_user_id, creditor_user_id, quantity, created_by
      ) values (
        '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        1,
        '10000000-0000-4000-8000-000000000001'
      )
    $$,
    '42501'
  ),
  'a member cannot spoof created_by'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      insert into public.transactions (
        group_id, debtor_user_id, creditor_user_id, quantity, created_by
      ) values (
        '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000004',
        1,
        '10000000-0000-4000-8000-000000000002'
      )
    $$,
    '42501'
  ),
  'a member cannot add an unrelated user as a ledger party'
);

select is_empty(
  $$
    update public.groups
    set currency_name = 'Unauthorized'
    where id = '20000000-0000-4000-8000-000000000001'
    returning id
  $$,
  'a member cannot update owner settings'
);

select ok(
  pg_temp.throws_sqlstate(
    $$select public.reverse_transaction('40000000-0000-4000-8000-000000000001')$$,
    '42501'
  ),
  'a non-creator member cannot reverse another transaction'
);

select ok(
  pg_temp.throws_sqlstate(
    $$select public.reverse_transaction('40000000-0000-4000-8000-000000000002')$$,
    '55000'
  ),
  'a transaction cannot be reversed twice'
);

select lives_ok(
  $$select public.leave_group('20000000-0000-4000-8000-000000000001')$$,
  'a member can leave through the self-scoped RPC'
);

select is((select count(*) from public.groups), 0::bigint, 'a former member loses group access');
select is((select count(*) from public.transactions), 0::bigint, 'a former member loses ledger access');
select is((select count(*) from public.memberships), 0::bigint, 'a former member loses membership access');
select is((select count(*) from public.profiles), 1::bigint, 'a former member can read only their own profile');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select ok(
  exists (
    select 1 from public.profiles
    where id = '10000000-0000-4000-8000-000000000002'
  ),
  'remaining members can identify a former member retained in history'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (
    select count(*) from public.groups
    where id = '20000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'a stranger cannot read another group'
);
select is(
  (
    select count(*) from public.transactions
    where group_id = '20000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'a stranger cannot read another ledger'
);
select is(
  (
    select count(*) from public.memberships
    where group_id = '20000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'a stranger cannot enumerate another group membership'
);

select is(
  public.join_group('30000000-0000-4000-8000-000000000001'),
  '20000000-0000-4000-8000-000000000001'::uuid,
  'an authenticated invite holder can join only the token-selected group'
);
select lives_ok(
  $$select public.join_group('30000000-0000-4000-8000-000000000001')$$,
  'replaying the same invite is idempotent'
);
select ok(
  pg_temp.throws_sqlstate(
    $$select public.leave_group('20000000-0000-4000-8000-000000000002')$$,
    '55000'
  ),
  'an owner cannot leave their group ownerless'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select ok(
  pg_temp.throws_sqlstate($$select count(*) from public.groups$$, '42501'),
  'anonymous callers cannot read group tables directly'
);
select ok(
  pg_temp.throws_sqlstate(
    $$select public.join_group('30000000-0000-4000-8000-000000000001')$$,
    '42501'
  ),
  'anonymous callers cannot execute authenticated RPCs'
);

reset role;

update public.groups
set owner_id = '10000000-0000-4000-8000-000000000003'
where id = '20000000-0000-4000-8000-000000000001';

update public.memberships
set role = 'member'
where group_id = '20000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000001';

update public.memberships
set role = 'owner'
where group_id = '20000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000003';

insert into public.group_owner_transfers (
  group_id,
  previous_owner_id,
  new_owner_id
) values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003'
);

delete from public.memberships
where group_id = '20000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.group_owner_transfers),
  1::bigint,
  'a previous owner retains access to their ownership-transfer history'
);
select ok(
  exists (
    select 1
    from public.profiles
    where id = '10000000-0000-4000-8000-000000000003'
  ),
  'a previous owner can identify the new owner after leaving the group'
);

reset role;

select ok(
  position(
    'FOR UPDATE' in upper(pg_get_functiondef('public.reverse_transaction(uuid)'::regprocedure))
  ) > 0,
  'reversal serializes concurrent attempts with a row lock'
);
select ok(
  position('FOR UPDATE' in upper(pg_get_functiondef('public.leave_group(uuid)'::regprocedure))) > 0
    and position(
      'FOR UPDATE' in upper(pg_get_functiondef('public.delete_group(uuid)'::regprocedure))
    ) > 0,
  'membership lifecycle RPCs lock mutable authorization state'
);

select * from finish();
rollback;
