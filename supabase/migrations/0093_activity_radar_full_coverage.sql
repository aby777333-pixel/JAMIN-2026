-- 0093: activity radar — full coverage
-- Owner ask: "if anything happens in the app, a light should blink in the
-- appropriate admin menu and a radar pop-up should appear."
-- Additive only: 11 more activity tables emit Realtime INSERT events (the
-- admin console's radar maps each to its sidebar tab), plus 3 additive
-- admin-read policies so those events pass RLS for the admin subscriber.
-- No existing policy, table or trigger is modified.

-- 1) Publication membership — Realtime only emits for published tables.
alter publication supabase_realtime add table
  public.cobroke_listings,
  public.cobroke_interests,
  public.deal_documents,
  public.loan_applications,
  public.escrow_milestones,
  public.referral_events,
  public.wishlists,
  public.property_watches,
  public.academy_enrollments,
  public.shortlist_items,
  public.shortlist_members;

-- 2) Admin visibility where RLS was owner/member-only. Realtime delivers a row
--    only if the subscriber could SELECT it; these tables had no admin read.
--    (Super Admin sees everything — per the platform brief.)
create policy wishlists_admin_read on public.wishlists
  for select using (auth_is_admin());
create policy shortlist_items_admin_read on public.shortlist_items
  for select using (auth_is_admin());
create policy shortlist_members_admin_read on public.shortlist_members
  for select using (auth_is_admin());
