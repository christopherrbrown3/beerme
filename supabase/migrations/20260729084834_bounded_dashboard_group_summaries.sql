-- The dashboard must not load a caller's full ledger just to render one card
-- per group. This caller-scoped RPC returns at most one compact summary for
-- each group visible through the existing RLS policies. It runs as the caller
-- so groups, memberships, and transactions remain independently protected by
-- their table policies.
create function public.get_dashboard_group_summaries()
returns table (
  id uuid,
  name text,
  description text,
  owner_id uuid,
  currency_name text,
  currency_plural text,
  currency_symbol text,
  created_at timestamptz,
  member_count integer,
  role public.membership_role,
  current_user_balance numeric,
  last_activity_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with caller_groups as (
    select
      beer_group.id,
      beer_group.name,
      beer_group.description,
      beer_group.owner_id,
      beer_group.currency_name,
      beer_group.currency_plural,
      beer_group.currency_symbol,
      beer_group.created_at,
      my_membership.role
    from public.groups as beer_group
    join public.memberships as my_membership
      on my_membership.group_id = beer_group.id
    where my_membership.user_id = (select auth.uid())
  ),
  member_counts as (
    select membership.group_id, count(*)::integer as member_count
    from public.memberships as membership
    join caller_groups on caller_groups.id = membership.group_id
    group by membership.group_id
  ),
  ledger_summaries as (
    select
      ledger_entry.group_id,
      coalesce(
        sum(
          case
            when ledger_entry.kind = 'iou'
              and ledger_entry.creditor_user_id = (select auth.uid())
              then ledger_entry.quantity
            when ledger_entry.kind = 'iou'
              and ledger_entry.debtor_user_id = (select auth.uid())
              then -ledger_entry.quantity
            when ledger_entry.kind = 'settlement'
              and ledger_entry.debtor_user_id = (select auth.uid())
              then ledger_entry.quantity
            when ledger_entry.kind = 'settlement'
              and ledger_entry.creditor_user_id = (select auth.uid())
              then -ledger_entry.quantity
            else 0
          end
        ) filter (where ledger_entry.reversed_at is null),
        0
      ) as current_user_balance,
      max(greatest(ledger_entry.created_at, ledger_entry.reversed_at)) as last_activity_at
    from public.transactions as ledger_entry
    join caller_groups on caller_groups.id = ledger_entry.group_id
    group by ledger_entry.group_id
  )
  select
    caller_groups.id,
    caller_groups.name,
    caller_groups.description,
    caller_groups.owner_id,
    caller_groups.currency_name,
    caller_groups.currency_plural,
    caller_groups.currency_symbol,
    caller_groups.created_at,
    coalesce(member_counts.member_count, 0),
    caller_groups.role,
    coalesce(ledger_summaries.current_user_balance, 0),
    ledger_summaries.last_activity_at
  from caller_groups
  left join member_counts on member_counts.group_id = caller_groups.id
  left join ledger_summaries on ledger_summaries.group_id = caller_groups.id
  order by caller_groups.created_at desc, caller_groups.id desc;
$$;

revoke all on function public.get_dashboard_group_summaries() from public;
grant execute on function public.get_dashboard_group_summaries() to authenticated;

comment on function public.get_dashboard_group_summaries() is
  'RLS-preserving caller-scoped group dashboard summaries without raw ledger history.';
