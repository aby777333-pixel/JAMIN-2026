-- JAMIN Properties — 0008 security hardening (resolves Supabase advisor WARNs).
-- 1) Pin search_path on remaining functions. 2) Revoke RPC EXECUTE on trigger-only
--    functions (triggers still fire; they just stop being callable via /rpc).
-- 3) Tighten the card_scans insert policy to the scanning user.

alter function public.set_updated_at()            set search_path = public;
alter function public.uuid_label(uuid)            set search_path = public;
alter function public.gen_referral_code()         set search_path = public;
alter function public.assign_plot_code()          set search_path = public;
alter function public.prevent_ledger_mutation()   set search_path = public;

-- Trigger-only / internal functions: not meant to be public RPCs.
revoke execute on function public.handle_new_user()           from public, anon, authenticated;
revoke execute on function public.handle_plot_sold()          from public, anon, authenticated;
revoke execute on function public.log_property_created()      from public, anon, authenticated;
revoke execute on function public.apply_ledger_to_wallet()    from public, anon, authenticated;
revoke execute on function public.handle_withdrawal_paid()    from public, anon, authenticated;
revoke execute on function public.next_plot_code(uuid)        from public, anon, authenticated;
revoke execute on function public.gen_referral_code()         from public, anon, authenticated;
revoke execute on function public.set_updated_at()            from public, anon, authenticated;
revoke execute on function public.assign_plot_code()          from public, anon, authenticated;
revoke execute on function public.prevent_ledger_mutation()   from public, anon, authenticated;
revoke execute on function public.uuid_label(uuid)            from public, anon, authenticated;

-- Helpers used inside RLS policies + the onboarding RPC must stay callable.
grant execute on function public.auth_role_slug()       to authenticated;
grant execute on function public.auth_is_admin()        to authenticated;
grant execute on function public.auth_hierarchy_path()  to authenticated;
grant execute on function public.complete_onboarding(text, text, text) to authenticated;

-- A scan is logged by the (signed-in) scanner for themselves.
drop policy if exists card_scans_insert on public.card_scans;
create policy card_scans_insert on public.card_scans for insert to authenticated
  with check (scanner_id = auth.uid());
