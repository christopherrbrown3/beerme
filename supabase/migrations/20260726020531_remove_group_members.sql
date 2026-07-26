create table public.group_member_removals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  removed_user_id uuid not null references public.profiles (id),
  removed_by uuid not null references public.profiles (id),
  removed_at timestamptz not null default now(),
  constraint group_member_removals_distinct_users check (removed_user_id <> removed_by)
);

create index group_member_removals_group_id_removed_at_idx
on public.group_member_removals (group_id, removed_at desc);

create index group_member_removals_removed_user_id_idx
on public.group_member_removals (removed_user_id);

create index group_member_removals_removed_by_idx
on public.group_member_removals (removed_by);

comment on table public.group_member_removals is
  'Append-only owner moderation history visible only to current group members.';

alter table public.group_member_removals enable row level security;

revoke all on table public.group_member_removals from anon, authenticated;
grant select on table public.group_member_removals to authenticated;

create policy "Members can read group member removals"
on public.group_member_removals
for select
to authenticated
using ((select private.is_group_member(group_id)));

create function private.shares_member_removal_history_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_member_removals removal
    join public.memberships mine on mine.group_id = removal.group_id
    where mine.user_id = auth.uid()
      and other_user_id in (removal.removed_user_id, removal.removed_by)
  );
$$;

revoke all on function private.shares_member_removal_history_with(uuid) from public;
grant execute on function private.shares_member_removal_history_with(uuid) to authenticated;

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
  or (select private.shares_member_removal_history_with(id))
);

create function public.remove_group_member(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_owner_id uuid;
  target_role public.membership_role;
begin
  if caller_id is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to remove a group member.';
  end if;

  select owner_id
  into target_owner_id
  from public.groups
  where id = target_group_id
  for update;

  if target_owner_id is null or target_owner_id <> caller_id then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Only the current group owner can remove a member.';
  end if;

  if target_user_id = caller_id then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'The group owner cannot be removed.';
  end if;

  select role
  into target_role
  from public.memberships
  where group_id = target_group_id
    and user_id = target_user_id
  for update;

  if target_role is null then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'The target user is not a member of this group.';
  end if;

  if target_role = 'owner' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'The group owner cannot be removed.';
  end if;

  insert into public.group_member_removals (
    group_id,
    removed_user_id,
    removed_by
  ) values (
    target_group_id,
    target_user_id,
    caller_id
  );

  delete from public.memberships
  where group_id = target_group_id
    and user_id = target_user_id;
end;
$$;

revoke all on function public.remove_group_member(uuid, uuid) from public;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
