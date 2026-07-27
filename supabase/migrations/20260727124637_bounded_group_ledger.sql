-- Keep group balance reads proportional to the number of member relationships,
-- rather than the number of historical ledger entries. The function deliberately
-- runs as the caller so the existing transaction RLS policy remains the
-- authorization boundary.
create index transactions_active_group_participants_idx
  on public.transactions (group_id, debtor_user_id, creditor_user_id)
  where reversed_at is null;

create function public.get_group_ledger_balances(target_group_id uuid)
returns table (
  debtor_user_id uuid,
  creditor_user_id uuid,
  quantity numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    ledger_entry.debtor_user_id,
    ledger_entry.creditor_user_id,
    sum(ledger_entry.quantity) as quantity
  from public.transactions as ledger_entry
  where ledger_entry.group_id = target_group_id
    and ledger_entry.reversed_at is null
  group by ledger_entry.debtor_user_id, ledger_entry.creditor_user_id;
$$;

revoke all on function public.get_group_ledger_balances(uuid) from public;
grant execute on function public.get_group_ledger_balances(uuid) to authenticated;

comment on function public.get_group_ledger_balances(uuid) is
  'RLS-preserving aggregate of active group ledger movements for bounded client summaries.';
