-- JAMIN Properties — 0015 lock down P7 functions from loose RPC exposure.
-- guard_profile_columns is a trigger only; close_sale is admin-gated (keep it for
-- authenticated, but not anon).
revoke execute on function public.guard_profile_columns() from public, anon, authenticated;
revoke execute on function public.close_sale(uuid) from public, anon;
