-- JAMIN Properties — 0063 cultural layer: admin registry + festivals.
-- ADDITIVE ONLY. (1) Registers the new Vastu / auspicious features in the
-- app_features catalog so the Super Admin can see/toggle/reorder them (they show
-- in the admin "Features" tab and the in-app "What's included" list). (2) Adds an
-- admin-managed `festivals` table that drives the Home festival banner — dates
-- are now editable from the admin panel instead of being hardcoded. Nothing is
-- gated on these, so no existing flow can regress.

-- ── (1) Feature registry entries (idempotent) ────────────────────────────────
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('vastu_muhurat',      'Vastu & Muhurat Guide',      'Plot facing, numerology (Mulank) and auspicious timing — in 7 Indian languages.', 'buyer', 'compass', 200),
  ('vastu_facing',       'Vastu Facing Filter',        'Buyers can filter and see each plot''s facing (North-East, East…) with a Vastu badge.', 'buyer', 'compass', 205),
  ('auspicious_insights','Auspicious Insights',        'A positive-only "Prosperity Index" & planetary reading on every property.', 'buyer', 'sparkles', 210),
  ('muhurat_dates',      'Auspicious Booking Dates',   'Panchang-based favourable days surfaced on site-visit and escrow booking.', 'buyer', 'calendar', 215),
  ('griha_pravesh',      'Griha Pravesh Checklist',    'A house-warming muhurat + checklist companion for buyers after purchase.', 'buyer', 'home', 220),
  ('festivals',          'Festival Offers & Banners',  'Auspicious-festival banners (Dhanteras, Akshaya Tritiya…) on the app Home.', 'buyer', 'gift', 225),
  ('multilingual',       'Multi-language (7 languages)','English, Hindi, Tamil, Malayalam, Telugu, Kannada & Urdu.', 'core', 'language', 230)
on conflict (key) do nothing;

-- ── (2) Admin-managed festivals ──────────────────────────────────────────────
create table if not exists public.festivals (
  id            uuid primary key default gen_random_uuid(),
  key           text unique,
  name          text not null,
  festival_date date not null,
  blurb         text,
  active        boolean not null default true,
  sort_order    int not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_festivals_updated') then
    create trigger trg_festivals_updated before update on public.festivals
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.festivals enable row level security;

drop policy if exists festivals_read on public.festivals;
create policy festivals_read on public.festivals for select to anon, authenticated using (true);

drop policy if exists festivals_admin on public.festivals;
create policy festivals_admin on public.festivals for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

grant select on public.festivals to anon, authenticated;
grant insert, update, delete on public.festivals to authenticated;

-- Seed the current festival list (idempotent by key). Owner can edit/extend in admin.
insert into public.festivals (key, name, festival_date, blurb, sort_order) values
  ('guru_purnima_2026',    'Guru Purnima',              '2026-07-29', 'A day of gratitude and new learning — a blessed time to begin ventures.', 10),
  ('ganesh_chaturthi_2026','Ganesh Chaturthi',          '2026-09-14', 'Lord Ganesha removes obstacles — auspicious for new beginnings and homes.', 20),
  ('navratri_2026',        'Navratri begins',           '2026-10-11', 'Nine nights of Shakti — a powerful, prosperous window for big decisions.', 30),
  ('dussehra_2026',        'Dussehra (Vijayadashami)',  '2026-10-20', 'Victory of good — one of the most auspicious days to start something new.', 40),
  ('dhanteras_2026',       'Dhanteras',                 '2026-11-06', 'The day of Dhanvantari & Kubera — traditionally ideal for buying gold, land & property.', 50),
  ('diwali_2026',          'Diwali · Lakshmi Puja',     '2026-11-08', 'Invite Goddess Lakshmi home — a most fortunate time for wealth & new property.', 60),
  ('makar_sankranti_2027', 'Makar Sankranti',           '2027-01-14', 'The sun turns northward (Uttarayana) — an auspicious season for fresh starts.', 70),
  ('ugadi_2027',           'Ugadi · Gudi Padwa',        '2027-03-18', 'The traditional New Year — a favoured day for Griha Pravesh and investments.', 80),
  ('akshaya_tritiya_2027', 'Akshaya Tritiya',           '2027-05-18', 'The day of never-diminishing fortune — the most auspicious of all to buy land & gold.', 90)
on conflict (key) do nothing;
