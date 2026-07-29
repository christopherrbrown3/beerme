alter table public.groups
add column members_can_invite boolean not null default true;

comment on column public.groups.members_can_invite is
  'Whether non-owner members may retrieve and share the current group invite capability.';

create or replace function public.get_group_invite_token(target_group_id uuid)
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
      message = 'Authentication is required to access an invite link.';
  end if;

  select invite.token
  into invite_token
  from private.group_invites invite
  join public.groups group_record on group_record.id = invite.group_id
  where invite.group_id = target_group_id
    and (
      group_record.owner_id = caller_id
      or (
        group_record.members_can_invite
        and exists (
          select 1
          from public.memberships membership
          where membership.group_id = group_record.id
            and membership.user_id = caller_id
        )
      )
    );

  if invite_token is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'You do not have permission to share this group invite link.';
  end if;

  return invite_token;
end;
$$;

revoke all on function public.get_group_invite_token(uuid) from public;
grant execute on function public.get_group_invite_token(uuid) to authenticated;

create function public.update_group_settings(
  target_group_id uuid,
  next_name text,
  next_description text,
  members_may_invite boolean
)
returns table (
  updated_name text,
  updated_description text,
  updated_members_can_invite boolean,
  updated_invite_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  members_could_invite boolean;
begin
  if caller_id is null then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Authentication is required to update group settings.';
  end if;

  select group_record.members_can_invite
  into members_could_invite
  from public.groups group_record
  where group_record.id = target_group_id
    and group_record.owner_id = caller_id
  for update;

  if not found then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Only the current group owner can update group settings.';
  end if;

  update public.groups
  set name = next_name,
      description = next_description,
      members_can_invite = members_may_invite
  where id = target_group_id;

  if members_could_invite and not members_may_invite then
    update private.group_invites
    set token = gen_random_uuid(),
        created_at = now()
    where group_id = target_group_id;

    insert into public.group_invite_rotations (group_id, rotated_by)
    values (target_group_id, caller_id);
  end if;

  return query
  select
    group_record.name,
    group_record.description,
    group_record.members_can_invite,
    invite.token
  from public.groups group_record
  join private.group_invites invite on invite.group_id = group_record.id
  where group_record.id = target_group_id;
end;
$$;

revoke all on function public.update_group_settings(uuid, text, text, boolean) from public;
grant execute on function public.update_group_settings(uuid, text, text, boolean) to authenticated;
