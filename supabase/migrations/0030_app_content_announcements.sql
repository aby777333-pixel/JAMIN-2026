-- 0030 — App Content + Announcements
-- Makes app-facing strings/config admin-editable and adds Home announcement banners.
-- The app reads these live; seeded values mirror the current hardcoded defaults, so
-- nothing changes in the app until an admin edits a value. Additive only.

-- ── App content (admin-editable key/value the app reads) ──────────────────────
create table if not exists public.app_content (
  key        text primary key,
  grp        text not null default 'General',
  label      text not null,
  kind       text not null default 'text',   -- text | textarea | number | url | boolean
  value      text,
  sort_order int  not null default 100,
  updated_at timestamptz not null default now()
);

alter table public.app_content enable row level security;

drop policy if exists app_content_read  on public.app_content;
drop policy if exists app_content_admin on public.app_content;
create policy app_content_read  on public.app_content for select using (true);
create policy app_content_admin on public.app_content for all
  using (public.auth_is_admin()) with check (public.auth_is_admin());

grant select on public.app_content to anon, authenticated;
grant insert, update, delete on public.app_content to authenticated;  -- RLS still gates writes to admins

-- ── Announcements (Home banners) ─────────────────────────────────────────────
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  image_url  text,
  cta_label  text,
  cta_url    text,
  audience   text not null default 'all',     -- all | buyer | partner
  active     boolean not null default true,
  sort_order int  not null default 100,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists announcements_read  on public.announcements;
drop policy if exists announcements_admin on public.announcements;
create policy announcements_read  on public.announcements for select using (true);
create policy announcements_admin on public.announcements for all
  using (public.auth_is_admin()) with check (public.auth_is_admin());

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- ── Seed known app keys (mirror current hardcoded defaults) ──────────────────
insert into public.app_content (key, grp, label, kind, value, sort_order) values
  ('brand.tagline',          'Brand',       'Tagline',                       'text',     'Signature for Fortune', 10),
  ('brand.name',             'Brand',       'Brand name',                    'text',     'JAMIN PROPERTIES',      20),
  ('home.buyer_card_title',  'Home',        'Buyer card — title',            'text',     'Find your next property', 30),
  ('home.buyer_card_body',   'Home',        'Buyer card — subtitle',         'textarea', 'Browse dynamic inventory, calculate EMI & ROI, and enquire or book a visit.', 40),
  ('support.phone',          'Support',     'Support phone',                 'text',     '',                      50),
  ('support.email',          'Support',     'Support email',                 'text',     '',                      60),
  ('support.whatsapp',       'Support',     'WhatsApp number (with code)',   'text',     '',                      70),
  ('support.hours',          'Support',     'Support hours',                 'text',     'Mon–Sat, 10am–7pm IST', 75),
  ('social.facebook',        'Social',      'Facebook URL',                  'url',      '',                      80),
  ('social.instagram',       'Social',      'Instagram URL',                 'url',      '',                      90),
  ('social.youtube',         'Social',      'YouTube URL',                   'url',      '',                      100),
  ('social.website',         'Social',      'Website URL',                   'url',      'https://jaminproperties.co', 110),
  ('calc.emi_down_pct',      'Calculators', 'EMI — default down-payment %',  'number',   '20',                    120),
  ('calc.emi_rate',          'Calculators', 'EMI — default interest rate %', 'number',   '9',                     130),
  ('calc.emi_years',         'Calculators', 'EMI — default tenure (years)',  'number',   '10',                    140),
  ('calc.roi_appreciation',  'Calculators', 'ROI — default appreciation %/yr','number',  '8',                     150),
  ('calc.roi_years',         'Calculators', 'ROI — default hold (years)',    'number',   '5',                     160),
  ('about.company',          'About',       'About the company',             'textarea', '',                      170)
on conflict (key) do nothing;
