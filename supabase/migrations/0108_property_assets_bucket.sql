-- 0108 — property-assets bucket: organized, scalable home for heavy listing
-- media (owner spec §6). Hierarchy (enforced by convention, admin-written):
--
--   property-assets/<property_id>/floor-plans/…
--   property-assets/<property_id>/brochures/…
--   property-assets/<property_id>/drone/…
--   property-assets/<property_id>/360/…
--   property-assets/<property_id>/legal/…
--
-- Existing buckets keep their roles: property-media = gallery photos/videos
-- (admin-curated), property-submissions = partner/seller capture uploads,
-- user-media = per-user files. Public read (listing assets are public by
-- nature); writes admin-only, mirroring property-media's policy set.

insert into storage.buckets (id, name, public)
values ('property-assets', 'property-assets', true)
on conflict (id) do nothing;

drop policy if exists property_assets_public_read on storage.objects;
create policy property_assets_public_read on storage.objects
  for select using (bucket_id = 'property-assets');

drop policy if exists property_assets_admin_insert on storage.objects;
create policy property_assets_admin_insert on storage.objects
  for insert with check (bucket_id = 'property-assets' and auth_is_admin());

drop policy if exists property_assets_admin_update on storage.objects;
create policy property_assets_admin_update on storage.objects
  for update using (bucket_id = 'property-assets' and auth_is_admin())
  with check (bucket_id = 'property-assets' and auth_is_admin());

drop policy if exists property_assets_admin_delete on storage.objects;
create policy property_assets_admin_delete on storage.objects
  for delete using (bucket_id = 'property-assets' and auth_is_admin());
