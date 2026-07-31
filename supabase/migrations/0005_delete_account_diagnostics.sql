-- ============================================================================
-- Plateato — Migration 0005: Harden delete_account() to fail loudly
--
-- Bug: testing showed delete_account() appeared to succeed (no error
-- returned, app redirected to sign-in) but the auth.users row was NOT
-- removed — confirmed by finding the email still present in
-- Authentication > Users afterward. A manual `delete from auth.users
-- where email = '...'` via the SQL editor DID work, ruling out a
-- database-level permission block on deleting auth.users.
--
-- `delete from auth.users where id = auth.uid()` matching zero rows is not
-- a SQL error — it's silent. The likely cause is auth.uid() not resolving
-- to the expected value inside this security definer function's context,
-- but that couldn't be confirmed without instrumentation. This migration
-- makes both failure modes (auth.uid() null, and zero rows deleted) raise
-- an explicit exception instead of silently returning success, so the next
-- test surfaces the real cause via the RPC's returned error message.
--
-- How to run: paste into the dashboard SQL editor.
-- ============================================================================

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted_count int;
begin
  if v_uid is null then
    raise exception 'delete_account: auth.uid() returned null — no authenticated user in this context';
  end if;

  delete from public.households h
  where exists (
      select 1 from public.household_members m
      where m.household_id = h.id and m.profile_id = v_uid
    )
    and not exists (
      select 1 from public.household_members m
      where m.household_id = h.id and m.profile_id <> v_uid
    );

  delete from auth.users where id = v_uid;
  get diagnostics v_deleted_count = row_count;

  if v_deleted_count = 0 then
    raise exception 'delete_account: no auth.users row was deleted for id %', v_uid;
  end if;
end;
$$;
