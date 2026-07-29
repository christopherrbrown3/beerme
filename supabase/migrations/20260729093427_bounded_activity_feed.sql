create function public.get_activity_feed()
returns table (
  event_id text,
  event_type text,
  group_id uuid,
  group_name text,
  group_symbol text,
  actor_id uuid,
  actor_username text,
  actor_display_name text,
  occurred_at timestamptz,
  title text,
  detail text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select *
  from (
    select
      'group-created:' || group_record.id as event_id,
      'group_created' as event_type,
      group_record.id as group_id,
      group_record.name as group_name,
      group_record.currency_symbol as group_symbol,
      owner_profile.id as actor_id,
      owner_profile.username as actor_username,
      owner_profile.display_name as actor_display_name,
      group_record.created_at as occurred_at,
      coalesce(nullif(btrim(owner_profile.display_name), ''), owner_profile.username)
        || ' created ' || group_record.name as title,
      'The group ledger opened.' as detail
    from public.groups as group_record
    join public.profiles as owner_profile on owner_profile.id = group_record.owner_id

    union all

    select
      'member-joined:' || membership.group_id || ':' || membership.user_id,
      'member_joined',
      group_record.id,
      group_record.name,
      group_record.currency_symbol,
      member_profile.id,
      member_profile.username,
      member_profile.display_name,
      membership.joined_at,
      coalesce(nullif(btrim(member_profile.display_name), ''), member_profile.username)
        || ' joined ' || group_record.name,
      'A new friend joined the ledger.'
    from public.memberships as membership
    join public.groups as group_record on group_record.id = membership.group_id
    join public.profiles as member_profile on member_profile.id = membership.user_id
    where membership.user_id <> group_record.owner_id

    union all

    select
      'owner-transferred:' || transfer.group_id || ':' || transfer.transferred_at,
      'owner_transferred',
      group_record.id,
      group_record.name,
      group_record.currency_symbol,
      previous_owner.id,
      previous_owner.username,
      previous_owner.display_name,
      transfer.transferred_at,
      coalesce(nullif(btrim(previous_owner.display_name), ''), previous_owner.username)
        || ' transferred ownership to '
        || coalesce(nullif(btrim(new_owner.display_name), ''), new_owner.username),
      coalesce(nullif(btrim(new_owner.display_name), ''), new_owner.username)
        || ' is now the group owner.'
    from public.group_owner_transfers as transfer
    join public.groups as group_record on group_record.id = transfer.group_id
    join public.profiles as previous_owner on previous_owner.id = transfer.previous_owner_id
    join public.profiles as new_owner on new_owner.id = transfer.new_owner_id

    union all

    select
      'member-removed:' || removal.id,
      'member_removed',
      group_record.id,
      group_record.name,
      group_record.currency_symbol,
      remover.id,
      remover.username,
      remover.display_name,
      removal.removed_at,
      coalesce(nullif(btrim(remover.display_name), ''), remover.username)
        || ' removed '
        || coalesce(nullif(btrim(removed_user.display_name), ''), removed_user.username)
        || ' from ' || group_record.name,
      coalesce(nullif(btrim(removed_user.display_name), ''), removed_user.username)
        || ' no longer has access to the group.'
    from public.group_member_removals as removal
    join public.groups as group_record on group_record.id = removal.group_id
    join public.profiles as remover on remover.id = removal.removed_by
    join public.profiles as removed_user on removed_user.id = removal.removed_user_id

    union all

    select
      'invite-rotated:' || rotation.id,
      'invite_rotated',
      group_record.id,
      group_record.name,
      group_record.currency_symbol,
      rotator.id,
      rotator.username,
      rotator.display_name,
      rotation.rotated_at,
      coalesce(nullif(btrim(rotator.display_name), ''), rotator.username)
        || ' rotated the invite link for ' || group_record.name,
      'The previous invite link no longer works.'
    from public.group_invite_rotations as rotation
    join public.groups as group_record on group_record.id = rotation.group_id
    join public.profiles as rotator on rotator.id = rotation.rotated_by

    union all

    select
      case ledger_entry.kind
        when 'settlement' then 'transaction-settled:' || ledger_entry.id
        else 'transaction-created:' || ledger_entry.id
      end,
      case ledger_entry.kind
        when 'settlement' then 'transaction_settled'
        else 'transaction_created'
      end,
      group_record.id,
      group_record.name,
      group_record.currency_symbol,
      created_by.id,
      created_by.username,
      created_by.display_name,
      ledger_entry.created_at,
      case ledger_entry.kind
        when 'settlement' then
          coalesce(nullif(btrim(debtor.display_name), ''), debtor.username)
            || ' settled up with '
            || coalesce(nullif(btrim(creditor.display_name), ''), creditor.username)
            || ' — ' || ledger_entry.quantity::bigint::text || ' '
            || case when ledger_entry.quantity = 1 then group_record.currency_name else group_record.currency_plural end
        else
          coalesce(nullif(btrim(debtor.display_name), ''), debtor.username)
            || ' owes ' || coalesce(nullif(btrim(creditor.display_name), ''), creditor.username)
            || ' ' || ledger_entry.quantity::bigint::text || ' '
            || case when ledger_entry.quantity = 1 then group_record.currency_name else group_record.currency_plural end
      end,
      ledger_entry.note
    from public.transactions as ledger_entry
    join public.groups as group_record on group_record.id = ledger_entry.group_id
    join public.profiles as created_by on created_by.id = ledger_entry.created_by
    join public.profiles as debtor on debtor.id = ledger_entry.debtor_user_id
    join public.profiles as creditor on creditor.id = ledger_entry.creditor_user_id

    union all

    select
      'transaction-reversed:' || ledger_entry.id,
      'transaction_reversed',
      group_record.id,
      group_record.name,
      group_record.currency_symbol,
      reversed_by.id,
      reversed_by.username,
      reversed_by.display_name,
      ledger_entry.reversed_at,
      coalesce(nullif(btrim(reversed_by.display_name), ''), reversed_by.username)
        || ' reversed a transaction',
      case ledger_entry.kind
        when 'settlement' then
          coalesce(nullif(btrim(debtor.display_name), ''), debtor.username)
            || ' settled up with '
            || coalesce(nullif(btrim(creditor.display_name), ''), creditor.username)
            || ' — ' || ledger_entry.quantity::bigint::text || ' '
            || case when ledger_entry.quantity = 1 then group_record.currency_name else group_record.currency_plural end
        else
          coalesce(nullif(btrim(debtor.display_name), ''), debtor.username)
            || ' owes ' || coalesce(nullif(btrim(creditor.display_name), ''), creditor.username)
            || ' ' || ledger_entry.quantity::bigint::text || ' '
            || case when ledger_entry.quantity = 1 then group_record.currency_name else group_record.currency_plural end
      end
    from public.transactions as ledger_entry
    join public.groups as group_record on group_record.id = ledger_entry.group_id
    join public.profiles as reversed_by on reversed_by.id = ledger_entry.reversed_by
    join public.profiles as debtor on debtor.id = ledger_entry.debtor_user_id
    join public.profiles as creditor on creditor.id = ledger_entry.creditor_user_id
    where ledger_entry.reversed_at is not null
  ) as activity_events
  order by occurred_at desc, event_id desc
  limit 100;
$$;

revoke all on function public.get_activity_feed() from public;
grant execute on function public.get_activity_feed() to authenticated;
