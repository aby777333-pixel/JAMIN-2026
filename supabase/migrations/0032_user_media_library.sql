-- 0032 — Promoter personal image library ("My Images").
-- Each user uploads/downloads/deletes their OWN images (for ads, brochures, sharing).
-- Files live in the public `user-media` bucket under <uid>/…; a row in user_media
-- tracks each one for easy listing. Owner-scoped RLS (+ admin oversight). Additive.

-- ── Storage bucket + object policies ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('user-media', 'user-media', true)
on conflict (id) do nothing;

drop policy if exists user_media_read   on storage.objects;
drop policy if exists user_media_insert on storage.objects;
drop policy if exists user_media_delete on storage.objects;
create policy user_media_read on storage.objects for select
  using (bucket_id = 'user-media');
create policy user_media_insert on storage.objects for insert
  with check (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy user_media_delete on storage.objects for delete
  using (bucket_id = 'user-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.auth_is_admin()));

-- ── Tracking table ───────────────────────────────────────────────────────────
create table if not exists public.user_media (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  url        text not null,
  path       text not null,           -- storage object path, for deletion
  name       text,
  created_at timestamptz not null default now()
);

alter table public.user_media enable row level security;

drop policy if exists user_media_own_select on public.user_media;
drop policy if exists user_media_own_insert on public.user_media;
drop policy if exists user_media_own_delete on public.user_media;
create policy user_media_own_select on public.user_media for select
  using (user_id = auth.uid() or public.auth_is_admin());
create policy user_media_own_insert on public.user_media for insert
  with check (user_id = auth.uid());
create policy user_media_own_delete on public.user_media for delete
  using (user_id = auth.uid() or public.auth_is_admin());

grant select, insert, delete on public.user_media to authenticated;
