update auth.users auth_user
set
  email = profile.username || '@users.beerme.invalid',
  email_confirmed_at = coalesce(auth_user.email_confirmed_at, now()),
  updated_at = now()
from public.profiles profile
where profile.id = auth_user.id
  and auth_user.email is distinct from profile.username || '@users.beerme.invalid';

update auth.identities identity
set
  identity_data = jsonb_set(
    coalesce(identity.identity_data, '{}'::jsonb),
    '{email}',
    to_jsonb(profile.username || '@users.beerme.invalid')
  ),
  updated_at = now()
from public.profiles profile
where profile.id = identity.user_id
  and identity.provider = 'email';

comment on column public.profiles.username is
  'Immutable, lowercase login handle and the only identifier collected by BeerMe.';
