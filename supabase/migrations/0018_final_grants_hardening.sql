-- JAMIN Properties — 0018 final hardening: stop anon from invoking the
-- SECURITY DEFINER helpers/RPCs. authenticated keeps execute (RLS policies call
-- the auth_* helpers; the RPCs are signed-in only). ltree stays in public (its
-- type is referenced by columns; moving it is high-risk and low-reward).
revoke execute on function public.auth_hierarchy_path() from public, anon;
revoke execute on function public.auth_is_admin() from public, anon;
revoke execute on function public.auth_role_slug() from public, anon;
revoke execute on function public.complete_onboarding(text, text, text) from public, anon;
revoke execute on function public.submit_kyc(jsonb) from public, anon;
revoke execute on function public.request_withdrawal(numeric, text) from public, anon;
revoke execute on function public.get_leaderboard(text, int) from public, anon;

-- belt-and-suspenders: re-affirm the authenticated grants
grant execute on function public.auth_hierarchy_path() to authenticated;
grant execute on function public.auth_is_admin() to authenticated;
grant execute on function public.auth_role_slug() to authenticated;
grant execute on function public.complete_onboarding(text, text, text) to authenticated;
grant execute on function public.submit_kyc(jsonb) to authenticated;
grant execute on function public.request_withdrawal(numeric, text) to authenticated;
grant execute on function public.get_leaderboard(text, int) to authenticated;
