grant update (currency_name, currency_plural, currency_symbol)
on table public.groups
to authenticated;

comment on column public.groups.currency_name is 'Singular name for the group ledger unit.';

do $$
begin
  alter publication supabase_realtime add table public.groups;
exception
  when duplicate_object then null;
end;
$$;
