create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username = lower(username)
    and username ~ '^[a-z0-9_]{3,24}$'
  ),
  constraint profiles_display_name_length check (
    char_length(btrim(display_name)) between 1 and 50
  )
);

comment on table public.profiles is 'Public-facing identity data for authenticated BeerMe users.';
comment on column public.profiles.username is 'Immutable, lowercase user handle.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own display name"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := lower(btrim(new.raw_user_meta_data ->> 'username'));
  requested_display_name text := btrim(new.raw_user_meta_data ->> 'display_name');
begin
  if requested_username is null
    or requested_username !~ '^[a-z0-9_]{3,24}$'
  then
    raise exception using
      errcode = 'check_violation',
      message = 'Username must be 3-24 lowercase letters, numbers, or underscores.';
  end if;

  if requested_display_name is null
    or char_length(requested_display_name) not between 1 and 50
  then
    raise exception using
      errcode = 'check_violation',
      message = 'Display name must be 1-50 characters.';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, requested_display_name);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    candidate = lower(candidate)
    and candidate ~ '^[a-z0-9_]{3,24}$'
    and not exists (
      select 1
      from public.profiles
      where username = candidate
    );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;
