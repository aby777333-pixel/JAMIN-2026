-- JAMIN Properties — 0034 shareable ad landing pages.
-- When a partner shares a Photo Ad, the recipient should open a RICH, interactive
-- page (image + maps + tap-to-call + live chat + sender card + referral QR) — not a
-- flat image. This table backs that public page (web/ad.html). Public read so any
-- recipient (anon) can open it; a partner inserts their own; owner/admin manage.

create table if not exists public.shared_ads (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  image_url      text not null,
  caption        text,
  place          text,
  lat            numeric,
  lng            numeric,
  agent_name     text,
  agent_phone    text,
  agent_referral text,
  captured_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_shared_ads_owner on public.shared_ads(owner_id);
create index if not exists idx_shared_ads_slug on public.shared_ads(slug);

alter table public.shared_ads enable row level security;

-- Public landing page: anyone (incl. anonymous recipients) may read a shared ad.
drop policy if exists shared_ads_read on public.shared_ads;
create policy shared_ads_read on public.shared_ads
  for select to anon, authenticated using (true);

-- A signed-in partner creates their own shared ad.
drop policy if exists shared_ads_insert on public.shared_ads;
create policy shared_ads_insert on public.shared_ads
  for insert to authenticated with check (owner_id = auth.uid());

-- Owner or admin may edit / delete.
drop policy if exists shared_ads_update on public.shared_ads;
create policy shared_ads_update on public.shared_ads
  for update to authenticated
  using (owner_id = auth.uid() or public.auth_is_admin())
  with check (owner_id = auth.uid() or public.auth_is_admin());

drop policy if exists shared_ads_delete on public.shared_ads;
create policy shared_ads_delete on public.shared_ads
  for delete to authenticated
  using (owner_id = auth.uid() or public.auth_is_admin());

-- Explicit grants (public-schema grant flip 2026-10-30 — new tables need these).
grant select on public.shared_ads to anon, authenticated;
grant insert, update, delete on public.shared_ads to authenticated;
