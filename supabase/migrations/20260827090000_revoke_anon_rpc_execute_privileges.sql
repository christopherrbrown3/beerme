-- Keep anonymous callers limited to the username-availability RPC.
--
-- PostgreSQL/Supabase role defaults can grant EXECUTE on newly created
-- functions to `anon`.  These RPCs all require an authenticated caller, so
-- make that boundary explicit for existing databases as well as fresh ones.

revoke execute on function public.join_group(uuid) from anon;
revoke execute on function public.leave_group(uuid) from anon;
revoke execute on function public.delete_group(uuid) from anon;
revoke execute on function public.get_group_ledger_balances(uuid) from anon;
revoke execute on function public.get_group_invite_token(uuid) from anon;
revoke execute on function public.rotate_group_invite(uuid) from anon;
revoke execute on function public.remove_group_member(uuid, uuid) from anon;
revoke execute on function public.get_dashboard_group_summaries() from anon;
revoke execute on function public.get_activity_feed() from anon;
revoke execute on function public.reverse_transaction(uuid) from anon;
revoke execute on function public.update_group_settings(uuid, text, text, boolean) from anon;
