create function private.shares_transaction_history_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.transactions ledger_entry
    join public.memberships mine on mine.group_id = ledger_entry.group_id
    where mine.user_id = auth.uid()
      and other_user_id in (
        ledger_entry.debtor_user_id,
        ledger_entry.creditor_user_id,
        ledger_entry.created_by,
        ledger_entry.reversed_by
      )
  );
$$;

revoke all on function private.shares_transaction_history_with(uuid) from public;
grant execute on function private.shares_transaction_history_with(uuid) to authenticated;

drop policy "Users can read profiles in shared groups" on public.profiles;

create policy "Users can read relevant profiles"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select private.shares_group_with(id))
  or (select private.shares_transaction_history_with(id))
);

create or replace function private.protect_transaction_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('beerme.deleting_group_id', true) = old.group_id::text then
      return old;
    end if;

    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Transaction history cannot be deleted.';
  end if;

  if old.group_id is distinct from new.group_id
    or old.debtor_user_id is distinct from new.debtor_user_id
    or old.creditor_user_id is distinct from new.creditor_user_id
    or old.quantity is distinct from new.quantity
    or old.note is distinct from new.note
    or old.created_by is distinct from new.created_by
    or old.created_at is distinct from new.created_at
  then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Transaction ledger entries are immutable.';
  end if;

  if old.reversed_at is not null
    or old.reversed_by is not null
    or new.reversed_at is null
    or new.reversed_by is null
  then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'A transaction may be reversed only once.';
  end if;

  return new;
end;
$$;

alter table public.transactions
drop constraint transactions_group_id_fkey;

alter table public.transactions
add constraint transactions_group_id_fkey
foreign key (group_id) references public.groups (id) on delete cascade;

create function public.leave_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.membership_role;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to leave a group.';
  end if;

  select role
  into target_role
  from public.memberships
  where group_id = target_group_id
    and user_id = auth.uid()
  for update;

  if target_role is null then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'That group membership is not available.';
  end if;

  if target_role = 'owner' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Group owners must delete the group instead of leaving it.';
  end if;

  delete from public.memberships
  where group_id = target_group_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.leave_group(uuid) from public;
grant execute on function public.leave_group(uuid) to authenticated;

create function public.delete_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to delete a group.';
  end if;

  select owner_id
  into target_owner_id
  from public.groups
  where id = target_group_id
  for update;

  if target_owner_id is null or target_owner_id <> auth.uid() then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Only the group owner can delete this group.';
  end if;

  perform set_config('beerme.deleting_group_id', target_group_id::text, true);
  delete from public.groups where id = target_group_id;
end;
$$;

revoke all on function public.delete_group(uuid) from public;
grant execute on function public.delete_group(uuid) to authenticated;
