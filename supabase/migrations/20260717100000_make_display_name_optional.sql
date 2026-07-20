alter table public.profiles alter column display_name drop not null;

alter table public.profiles drop constraint profiles_display_name_length;

alter table public.profiles add constraint profiles_display_name_length
  check (
    display_name is null
    or char_length(btrim(display_name)) between 1 and 50
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := lower(btrim(new.raw_user_meta_data ->> 'username'));
  requested_display_name text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  if requested_username is null
    or requested_username !~ '^[a-z0-9_]{3,24}$'
  then
    raise exception using
      errcode = 'check_violation',
      message = 'Username must be 3-24 lowercase letters, numbers, or underscores.';
  end if;

  if requested_display_name is not null
    and char_length(requested_display_name) not between 1 and 50
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
