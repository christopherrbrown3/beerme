create type public.membership_role as enum ('owner', 'member');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles (id),
  invite_token uuid not null default gen_random_uuid() unique,
  currency_name text not null default 'Beer',
  currency_plural text not null default 'Beers',
  currency_symbol text not null default '🍺',
  created_at timestamptz not null default now(),
  constraint groups_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint groups_description_length check (
    description is null or char_length(description) <= 280
  ),
  constraint groups_currency_name_length check (char_length(btrim(currency_name)) between 1 and 30),
  constraint groups_currency_plural_length check (char_length(btrim(currency_plural)) between 1 and 30),
  constraint groups_currency_symbol_length check (char_length(currency_symbol) between 1 and 12)
);

create table public.memberships (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id, joined_at desc);
create index groups_owner_id_idx on public.groups (owner_id, created_at desc);

comment on table public.groups is 'Friend groups that share an append-only IOU ledger.';
comment on column public.groups.invite_token is 'Unlisted capability token used by the authenticated join RPC.';
comment on column public.groups.currency_name is 'Future-facing group unit; fixed to Beer in the Version 1 UI.';
comment on table public.memberships is 'User membership and role within a group.';

alter table public.groups enable row level security;
alter table public.memberships enable row level security;

revoke all on table public.groups from anon, authenticated;
revoke all on table public.memberships from anon, authenticated;
grant select, insert on table public.groups to authenticated;
grant update (name, description) on table public.groups to authenticated;
grant select on table public.memberships to authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.is_group_member(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where group_id = target_group_id
      and user_id = target_user_id
  );
$$;

revoke all on function private.is_group_member(uuid, uuid) from public;
grant execute on function private.is_group_member(uuid, uuid) to authenticated;

create function private.shares_group_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid()
      and theirs.user_id = other_user_id
  );
$$;

revoke all on function private.shares_group_with(uuid) from public;
grant execute on function private.shares_group_with(uuid) to authenticated;

drop policy "Users can read their own profile" on public.profiles;

create policy "Users can read profiles in shared groups"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select private.shares_group_with(id))
);

create policy "Members can read their groups"
on public.groups
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_group_member(id))
);

create policy "Users can create groups they own"
on public.groups
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "Owners can update their groups"
on public.groups
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Members can read group memberships"
on public.memberships
for select
to authenticated
using ((select private.is_group_member(group_id)));

create function private.add_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.memberships (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  return new;
end;
$$;

revoke all on function private.add_group_owner_membership() from public;

create trigger on_group_created
after insert on public.groups
for each row execute function private.add_group_owner_membership();

create function public.join_group(token uuid)
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

  select id
  into target_group_id
  from public.groups
  where invite_token = token;

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

revoke all on function public.join_group(uuid) from public;
grant execute on function public.join_group(uuid) to authenticated;
