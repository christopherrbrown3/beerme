create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete restrict,
  debtor_user_id uuid not null references public.profiles (id) on delete restrict,
  creditor_user_id uuid not null references public.profiles (id) on delete restrict,
  quantity numeric(10, 2) not null,
  note text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles (id) on delete restrict,
  constraint transactions_distinct_parties check (debtor_user_id <> creditor_user_id),
  constraint transactions_quantity_range check (
    quantity between 1 and 99 and quantity = trunc(quantity)
  ),
  constraint transactions_note_length check (note is null or char_length(note) <= 280),
  constraint transactions_reversal_complete check (
    (reversed_at is null and reversed_by is null)
    or (reversed_at is not null and reversed_by is not null)
  )
);

create index transactions_group_created_at_idx
on public.transactions (group_id, created_at desc);

create index transactions_group_debtor_idx
on public.transactions (group_id, debtor_user_id, created_at desc);

create index transactions_group_creditor_idx
on public.transactions (group_id, creditor_user_id, created_at desc);

comment on table public.transactions is 'Append-only unit-agnostic IOU ledger entries.';
comment on column public.transactions.quantity is 'Unit-agnostic numeric quantity; display units come from the group.';
comment on column public.transactions.reversed_at is 'Set only through reverse_transaction; original history remains intact.';

alter table public.transactions enable row level security;

revoke all on table public.transactions from anon, authenticated;
grant select on table public.transactions to authenticated;
grant insert (
  group_id,
  debtor_user_id,
  creditor_user_id,
  quantity,
  note,
  created_by
) on table public.transactions to authenticated;

create policy "Members can read group transactions"
on public.transactions
for select
to authenticated
using ((select private.is_group_member(group_id)));

create policy "Members can add valid group transactions"
on public.transactions
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.is_group_member(group_id))
  and (select private.is_group_member(group_id, debtor_user_id))
  and (select private.is_group_member(group_id, creditor_user_id))
);

create function private.protect_transaction_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
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

revoke all on function private.protect_transaction_history() from public;

create trigger protect_transaction_history
before update or delete on public.transactions
for each row execute function private.protect_transaction_history();

create function public.reverse_transaction(transaction_id uuid)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.transactions;
  target_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to reverse a transaction.';
  end if;

  select *
  into target
  from public.transactions
  where id = transaction_id
  for update;

  if target.id is null
    or not private.is_group_member(target.group_id)
  then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'That transaction is not available.';
  end if;

  select owner_id
  into target_owner_id
  from public.groups
  where id = target.group_id;

  if target.reversed_at is not null then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'That transaction has already been reversed.';
  end if;

  if target.created_by <> auth.uid()
    and target_owner_id <> auth.uid()
  then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Only the creator or group owner can reverse this transaction.';
  end if;

  update public.transactions
  set reversed_at = clock_timestamp(), reversed_by = auth.uid()
  where id = transaction_id
  returning * into target;

  return target;
end;
$$;

revoke all on function public.reverse_transaction(uuid) from public;
grant execute on function public.reverse_transaction(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end;
$$;
