create table private.group_invites (
  group_id uuid primary key references public.groups (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

comment on table private.group_invites is
  'Private, revocable capability tokens for authenticated group joining.';

alter table private.group_invites enable row level security;

revoke all on table private.group_invites from public, anon, authenticated;

insert into private.group_invites (group_id, token, created_at)
select id, invite_token, created_at
from public.groups;

alter table public.groups drop column invite_token;

create or replace function private.add_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.memberships (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  insert into private.group_invites (group_id)
  values (new.id);

  return new;
end;
$$;

create table public.group_invite_rotations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  rotated_by uuid not null references public.profiles (id),
  rotated_at timestamptz not null default now()
);

create index group_invite_rotations_group_id_rotated_at_idx
on public.group_invite_rotations (group_id, rotated_at desc);

comment on table public.group_invite_rotations is
  'Append-only invite capability rotation history; tokens are never stored here.';

alter table public.group_invite_rotations enable row level security;

revoke all on table public.group_invite_rotations from anon, authenticated;
grant select on table public.group_invite_rotations to authenticated;

create policy "Members can read group invite rotations"
on public.group_invite_rotations
for select
to authenticated
using ((select private.is_group_member(group_id)));

create function private.shares_invite_rotation_history_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_invite_rotations rotation
    join public.memberships mine on mine.group_id = rotation.group_id
    where mine.user_id = auth.uid()
      and other_user_id = rotation.rotated_by
  );
$$;

revoke all on function private.shares_invite_rotation_history_with(uuid) from public;
grant execute on function private.shares_invite_rotation_history_with(uuid) to authenticated;

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
  or (select private.shares_invite_rotation_history_with(id))
);

create or replace function public.join_group(token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group_id uuid;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to join a group.';
  end if;

  select group_id
  into target_group_id
  from private.group_invites
  where private.group_invites.token = $1;

  if target_group_id is null then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'That invite link is not valid.';
  end if;

  insert into public.memberships (group_id, user_id, role)
  values (target_group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return target_group_id;
end;
$$;

create function public.get_group_invite_token(target_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  invite_token uuid;
begin
  if caller_id is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to manage an invite link.';
  end if;

  select token
  into invite_token
  from private.group_invites invite
  join public.groups group_record on group_record.id = invite.group_id
  where invite.group_id = target_group_id
    and group_record.owner_id = caller_id;

  if invite_token is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Only the current group owner can manage this invite link.';
  end if;

  return invite_token;
end;
$$;

create function public.rotate_group_invite(target_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  last_rotated_at timestamptz;
  next_token uuid;
begin
  if caller_id is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to rotate an invite link.';
  end if;

  perform 1
  from public.groups
  where id = target_group_id
    and owner_id = caller_id
  for update;

  if not found then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Only the current group owner can rotate this invite link.';
  end if;

  select rotated_at
  into last_rotated_at
  from public.group_invite_rotations
  where group_id = target_group_id
  order by rotated_at desc
  limit 1;

  if last_rotated_at is not null and last_rotated_at > now() - interval '1 minute' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'Please wait a minute before rotating this invite again.';
  end if;

  update private.group_invites
  set token = gen_random_uuid(),
      created_at = now()
  where group_id = target_group_id
  returning token into next_token;

  if next_token is null then
    raise exception using
      errcode = 'data_exception',
      message = 'The group invite could not be rotated.';
  end if;

  insert into public.group_invite_rotations (group_id, rotated_by)
  values (target_group_id, caller_id);

  return next_token;
end;
$$;

revoke all on function public.get_group_invite_token(uuid) from public;
grant execute on function public.get_group_invite_token(uuid) to authenticated;

revoke all on function public.rotate_group_invite(uuid) from public;
grant execute on function public.rotate_group_invite(uuid) to authenticated;
