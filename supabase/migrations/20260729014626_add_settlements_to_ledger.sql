create type public.transaction_kind as enum ('iou', 'settlement');

alter table public.transactions
add column kind public.transaction_kind not null default 'iou';

comment on column public.transactions.kind is
  'Distinguishes a new IOU from an in-kind return that reduces an existing obligation.';

drop policy "Members can add valid group transactions" on public.transactions;

create policy "Members can add valid group transactions"
on public.transactions
for insert
to authenticated
with check (
  kind = 'iou'
  and created_by = (select auth.uid())
  and (select private.is_group_member(group_id))
  and (select private.is_group_member(group_id, debtor_user_id))
  and (select private.is_group_member(group_id, creditor_user_id))
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
    or old.kind is distinct from new.kind
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

create function private.serialize_transaction_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.groups
  where id = new.group_id
  for update;

  return new;
end;
$$;

revoke all on function private.serialize_transaction_insert() from public, anon, authenticated;

create trigger serialize_transaction_insert
before insert on public.transactions
for each row execute function private.serialize_transaction_insert();

create or replace function public.get_group_ledger_balances(target_group_id uuid)
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
    case
      when ledger_entry.kind = 'settlement' then ledger_entry.creditor_user_id
      else ledger_entry.debtor_user_id
    end as debtor_user_id,
    case
      when ledger_entry.kind = 'settlement' then ledger_entry.debtor_user_id
      else ledger_entry.creditor_user_id
    end as creditor_user_id,
    sum(ledger_entry.quantity) as quantity
  from public.transactions as ledger_entry
  where ledger_entry.group_id = target_group_id
    and ledger_entry.reversed_at is null
  group by
    case
      when ledger_entry.kind = 'settlement' then ledger_entry.creditor_user_id
      else ledger_entry.debtor_user_id
    end,
    case
      when ledger_entry.kind = 'settlement' then ledger_entry.debtor_user_id
      else ledger_entry.creditor_user_id
    end;
$$;

create function public.settle_up(
  target_group_id uuid,
  target_creditor_user_id uuid,
  settlement_quantity numeric
)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  outstanding_quantity numeric;
  settlement public.transactions;
begin
  if current_user_id is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to settle up.';
  end if;

  if target_creditor_user_id is null
    or target_creditor_user_id = current_user_id
  then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'Choose another group member to settle up with.';
  end if;

  if settlement_quantity is null
    or settlement_quantity < 1
    or settlement_quantity > 99
    or settlement_quantity <> trunc(settlement_quantity)
  then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'Settlement quantity must be a whole number from 1 to 99.';
  end if;

  perform 1
  from public.groups
  where id = target_group_id
  for update;

  if not found
    or not private.is_group_member(target_group_id, current_user_id)
    or not private.is_group_member(target_group_id, target_creditor_user_id)
  then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'That group relationship is not available.';
  end if;

  select coalesce(
    sum(
      case
        when ledger_entry.debtor_user_id = current_user_id
          and ledger_entry.creditor_user_id = target_creditor_user_id
        then case when ledger_entry.kind = 'iou' then ledger_entry.quantity else -ledger_entry.quantity end
        when ledger_entry.debtor_user_id = target_creditor_user_id
          and ledger_entry.creditor_user_id = current_user_id
        then case when ledger_entry.kind = 'iou' then -ledger_entry.quantity else ledger_entry.quantity end
        else 0
      end
    ),
    0
  )
  into outstanding_quantity
  from public.transactions as ledger_entry
  where ledger_entry.group_id = target_group_id
    and ledger_entry.reversed_at is null
    and (
      (
        ledger_entry.debtor_user_id = current_user_id
        and ledger_entry.creditor_user_id = target_creditor_user_id
      )
      or (
        ledger_entry.debtor_user_id = target_creditor_user_id
        and ledger_entry.creditor_user_id = current_user_id
      )
    );

  if outstanding_quantity <= 0 then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'You do not currently owe this person.';
  end if;

  if settlement_quantity > outstanding_quantity then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'You cannot settle more than the current amount owed.';
  end if;

  insert into public.transactions (
    group_id,
    debtor_user_id,
    creditor_user_id,
    quantity,
    kind,
    created_by
  )
  values (
    target_group_id,
    current_user_id,
    target_creditor_user_id,
    settlement_quantity,
    'settlement',
    current_user_id
  )
  returning * into settlement;

  return settlement;
end;
$$;

revoke all on function public.settle_up(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.settle_up(uuid, uuid, numeric) to authenticated;

comment on function public.settle_up(uuid, uuid, numeric) is
  'Atomically records an authenticated member returning part or all of their current in-kind debt.';
