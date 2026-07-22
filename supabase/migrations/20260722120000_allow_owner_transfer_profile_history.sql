create function private.shares_owner_transfer_history_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_owner_transfers transfer
    where other_user_id in (transfer.previous_owner_id, transfer.new_owner_id)
      and (
        auth.uid() in (transfer.previous_owner_id, transfer.new_owner_id)
        or exists (
          select 1
          from public.memberships membership
          where membership.group_id = transfer.group_id
            and membership.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function private.shares_owner_transfer_history_with(uuid) from public;
grant execute on function private.shares_owner_transfer_history_with(uuid) to authenticated;

drop policy "Users can read relevant profiles" on public.profiles;

create policy "Users can read relevant profiles"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select private.shares_group_with(id))
  or (select private.shares_transaction_history_with(id))
  or (select private.shares_owner_transfer_history_with(id))
);
