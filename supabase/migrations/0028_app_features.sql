-- JAMIN Properties — 0028 dynamic feature registry (MOD16 Core Platform Rule —
-- "everything configurable by the Super Admin"). ADDITIVE ONLY. A DB-driven catalog
-- of platform features the admin can add / edit / toggle / reorder. No existing flow
-- is gated on these flags (purely additive), so nothing can regress.

create table if not exists public.app_features (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name        text not null,
  description text,
  category    text not null default 'core',     -- core | buyer | partner | admin | ai
  icon        text not null default 'cube',      -- ionicons name
  enabled     boolean not null default true,
  sort_order  int not null default 100,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_app_features_updated before update on public.app_features
  for each row execute function public.set_updated_at();

alter table public.app_features enable row level security;
-- Readable by everyone (the in-app catalog + web list); writable by admins only.
create policy app_features_read on public.app_features for select to anon, authenticated using (true);
create policy app_features_admin on public.app_features for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

grant select on public.app_features to anon, authenticated;
grant insert, update, delete on public.app_features to authenticated;

-- Seed the 16 blueprint modules (idempotent; only inserts missing keys).
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('hierarchy',   'User Hierarchy & Commission Network', 'Unlimited multi-level network with role-based control and full referral mapping.', 'core', 'git-network', 10),
  ('onboarding',  'Registration & Onboarding', 'Frictionless verified sign-up with automatic placement into the referral hierarchy.', 'core', 'person-add', 20),
  ('inventory',   'Inventory Management', 'Dynamic projects, plans, property types and plots — coded, tracked and auto-replaced on sale.', 'admin', 'business', 30),
  ('buyer',       'Buyer App', 'Search, tour, calculate EMI/ROI, enquire, book and track — the full discovery journey.', 'buyer', 'search', 40),
  ('agent',       'Agent Portal', 'Lead-to-close workspace with sharing tools, commission visibility and a wallet.', 'partner', 'briefcase', 50),
  ('promoter',    'Promoter Portal', 'Recruit, build and monitor teams while tracking revenue, bonuses and territory.', 'partner', 'people', 60),
  ('brochure',    'Smart Brochure System', 'Brand-controlled collateral that auto-personalises to each user and shares everywhere.', 'partner', 'document-text', 70),
  ('referral',    'Viral Referral Engine', 'Every share tracked end-to-end — click to registration to hierarchy — with fraud control.', 'partner', 'share-social', 80),
  ('photo_ad',    'Property Photo Ad Creator', 'Capture a property live on-site and auto-generate a branded, geo-verified ad in seconds.', 'partner', 'camera', 90),
  ('commission',  'Dynamic Commission Engine', 'Configurable commission models across property, project and plan with overrides and slabs.', 'core', 'cash', 100),
  ('forms',       'Dynamic Form Builder', 'Drag-and-drop builder for every form type with unlimited custom fields.', 'admin', 'construct', 110),
  ('admin',       'Admin Portal', 'Central command for property, users, inventory, commission rules, approvals, CRM and analytics.', 'admin', 'shield-checkmark', 120),
  ('backend',     'Backend Services', 'Modular services powering auth, inventory, CRM, referrals, wallets and media.', 'core', 'server', 130),
  ('ai',          'AI Features', 'Generative intelligence for listings, creatives, campaigns, lead scoring and assistance.', 'ai', 'sparkles', 140),
  ('gamification','Gamification', 'Leaderboards, badges, milestones and cash bonuses that keep the network engaged.', 'partner', 'trophy', 150),
  ('core_rule',   'Core Platform Rule', 'Everything is dynamic, unlimited and fully configurable by the Super Admin.', 'core', 'options', 160)
on conflict (key) do nothing;
