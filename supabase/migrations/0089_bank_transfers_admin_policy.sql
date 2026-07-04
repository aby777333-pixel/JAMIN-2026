-- JAMIN Properties — 0089 admins can record bank-transfer proofs on behalf of
-- buyers (walk-ins / proofs received on WhatsApp). Adds the standard admin-ALL
-- policy that bank_transfers was missing (buyers' own-rows policies unchanged).
create policy bank_transfers_admin on public.bank_transfers
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
grant update on public.bank_transfers to authenticated; -- RLS still limits writes to admins
