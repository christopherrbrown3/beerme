create table public.group_owner_transfers (
  group_id uuid not null references public.groups (id) on delete cascade,
  previous_owner_id uuid not null references public.profiles (id),
  new_owner_id uuid not null references public.profiles (id),
  transferred_at timestamptz not null default now()
);

create index group_owner_transfers_group_id_idx
  on public.group_owner_transfers (group_id, transferred_at desc);

alter table public.group_owner_transfers enable row level security;

revoke all on table public.group_owner_transfers from anon, authenticated;
grant select on table public.group_owner_transfers to authenticated;

create policy "Members can read group owner transfers"
  on public.group_owner_transfers
  for select
  to authenticated
  using (
    (select auth.uid()) = previous_owner_id
    or (select auth.uid()) = new_owner_id
    or (select private.is_group_member(group_id))
  );

create function public.transfer_group_ownership(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner_id uuid;
  target_role public.membership_role;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to transfer group ownership.';
  end if;

  select owner_id
  into current_owner_id
  from public.groups
  where id = target_group_id
  for update;

  if current_owner_id is null or current_owner_id <> auth.uid() then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Only the current group owner can transfer ownership.';
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

  if target_user_id = current_owner_id then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'Cannot transfer ownership to the current owner.';
  end if;

  update public.groups
  set owner_id = target_user_id
  where id = target_group_id;

  update public.memberships
  set role = case
    when user_id = target_user_id then 'owner'
    else 'member'
  end
  where group_id = target_group_id
    and user_id in (current_owner_id, target_user_id);

  insert into public.group_owner_transfers (group_id, previous_owner_id, new_owner_id)
  values (target_group_id, current_owner_id, target_user_id);
end;
$$;

revoke all on function public.transfer_group_ownership(uuid, uuid) from public;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
