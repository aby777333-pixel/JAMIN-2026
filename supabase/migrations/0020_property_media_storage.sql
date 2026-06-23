-- JAMIN Properties — 0020 storage bucket for property images (web admin uploads).
-- Public read (so the phone app can show images); only admins can write.
insert into storage.buckets (id, name, public)
values ('property-media', 'property-media', true)
on conflict (id) do nothing;

-- Admins (is_admin) may upload / change / remove objects in this bucket.
create policy "property_media_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-media' and public.auth_is_admin());
create policy "property_media_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'property-media' and public.auth_is_admin())
  with check (bucket_id = 'property-media' and public.auth_is_admin());
create policy "property_media_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'property-media' and public.auth_is_admin());

-- Anyone can read (public bucket; explicit policy for API listing).
create policy "property_media_public_read" on storage.objects for select to public
  using (bucket_id = 'property-media');
