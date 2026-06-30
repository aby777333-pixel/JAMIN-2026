-- JAMIN Properties — 0062 uploadable marketing assets (brochures / flyers / posters).
-- Admin uploads a file (PDF or image) in the Marketing tab; it surfaces in the app's
-- Brochures library for everyone to view/download. Files live in the public
-- property-media bucket (admin already uploads there). Additive & regression-safe.

create table if not exists public.marketing_assets (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'brochure' check (kind in ('brochure','flyer','poster')),
  file_url    text not null,
  file_path   text,
  thumb_url   text,
  project_id  uuid references public.projects(id) on delete set null,
  mime        text,
  active      boolean not null default true,
  sort_order  int not null default 100,
  created_by  uuid,
  created_at  timestamptz not null default now()
);
create index if not exists idx_marketing_assets_active on public.marketing_assets(active, sort_order);

alter table public.marketing_assets enable row level security;
-- Anyone signed-in sees active assets; admins manage everything.
drop policy if exists marketing_assets_read on public.marketing_assets;
create policy marketing_assets_read on public.marketing_assets for select to authenticated
  using (active or public.auth_is_admin());
drop policy if exists marketing_assets_admin on public.marketing_assets;
create policy marketing_assets_admin on public.marketing_assets for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
grant select, insert, update, delete on public.marketing_assets to authenticated;

insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('marketing_files', 'Brochure / Flyer / Poster Library', 'Admin-uploaded marketing files, viewable in the app.', 'partner', 'documents', 76)
on conflict (key) do nothing;
