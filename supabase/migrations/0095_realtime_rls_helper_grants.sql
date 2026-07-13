-- 0095: Realtime delivery fix — RLS helper EXECUTE grants
-- Symptom: admin radar dark (no blinks/toasts). Realtime logs showed
--   "permission denied for function auth_is_admin" inside realtime.apply_rls
--   (walrus_rls_stmt) → the whole polling batch errors and NO events deliver.
-- Cause: Realtime evaluates each published table's SELECT policies AS the
--   subscriber's role. anon subscribers exist (shared-ad live chat), and the
--   pre-launch hardening (0018) revoked helper EXECUTE from public/anon, so
--   quals mentioning auth_is_admin()/is_shortlist_member()/
--   auth_hierarchy_path() blow up under anon.
-- Fix: grant EXECUTE on the three predicate helpers to anon + authenticated.
--   They are pure boolean/path helpers keyed to auth.uid() — anon simply gets
--   false/null; executing them exposes no data (they GATE access, RLS still
--   decides). can_see_thread already had both grants.
grant execute on function public.auth_is_admin() to anon, authenticated;
grant execute on function public.auth_hierarchy_path() to anon, authenticated;
grant execute on function public.is_shortlist_member(uuid) to anon, authenticated;
