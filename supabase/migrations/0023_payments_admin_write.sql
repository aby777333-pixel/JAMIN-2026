-- JAMIN Properties — 0023 admin write on payments (MOD12 payment approvals).
-- Buyer/agent read stays via payments_select; this lets admins record/mark payments
-- (e.g. confirm an offline/manual payment) from the admin console.
create policy "payments_admin_write" on public.payments for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
