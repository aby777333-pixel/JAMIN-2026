-- JAMIN Properties — 0013 Smart Brochure System (§5.07) + Photo Ad Creator (§5.09).
-- brochure_templates = dynamic, admin-managed library (§13). brochures & ad_creatives
-- record personalized/generated artifacts per user for tracking & analytics.

create table public.brochure_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null default 'flyer'
               check (kind in ('project','flyer','offer','image','video','campaign')),
  config     jsonb not null default '{}'::jsonb,   -- {accent, headline, subhead, body, cta}
  active     boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.brochures (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  template_id uuid references public.brochure_templates(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  channel     text,
  created_at  timestamptz not null default now()
);
create index idx_brochures_user on public.brochures(user_id);

create table public.ad_creatives (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  format      text not null default 'post',
  geo         jsonb,
  place       text,
  captured_at timestamptz,
  image_path  text,
  created_at  timestamptz not null default now()
);
create index idx_ad_creatives_user on public.ad_creatives(user_id);

-- RLS
alter table public.brochure_templates enable row level security;
alter table public.brochures enable row level security;
alter table public.ad_creatives enable row level security;

-- templates: read by any signed-in user, write by admins (dynamic config)
create policy brochure_templates_read on public.brochure_templates for select to authenticated using (true);
create policy brochure_templates_admin on public.brochure_templates for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- instances: own-only
create policy brochures_own on public.brochures for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ad_creatives_own on public.ad_creatives for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed the starter brochure library.
insert into public.brochure_templates (name, kind, config, is_default) values
  ('Project Showcase', 'project',
   '{"accent":"#FD0001","headline":"Own a piece of fortune","subhead":"Premium gated plots & villas","cta":"Enquire today"}'::jsonb, true),
  ('Property Flyer', 'flyer',
   '{"accent":"#202020","headline":"Now selling","subhead":"Limited inventory","cta":"Book a site visit"}'::jsonb, false),
  ('Festive Offer', 'offer',
   '{"accent":"#FBBC15","headline":"Festive bonanza","subhead":"Special pricing this season","cta":"Claim your offer"}'::jsonb, false);
