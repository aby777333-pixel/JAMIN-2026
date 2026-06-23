-- JAMIN Properties — 0001 foundation: extensions, dynamic roles & config tables.
-- SuperPrompt §7/§13: roles, projects, plans, property_types, commission_rules,
-- form_definitions, gamification_rules, referral_rules, system_config are all
-- DYNAMIC — rows, not hardcoded enums. Super Admin owns every one of them.

create extension if not exists ltree;
create extension if not exists pgcrypto;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Roles (the hierarchy is data, levels are just ordering) ──────────────────
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  level       int  not null,                 -- 1 = highest (Super Admin)
  is_admin    boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_roles_updated before update on public.roles
  for each row execute function public.set_updated_at();

insert into public.roles (slug, name, level, is_admin) values
  ('super_admin',       'Super Admin',       1, true),
  ('state_head',        'State Head',         2, false),
  ('regional_manager',  'Regional Manager',   3, false),
  ('promoter',          'Promoter',           4, false),
  ('sub_promoter',      'Sub Promoter',       5, false),
  ('agent',             'Agent',              6, false),
  ('buyer',             'Buyer',              7, false);

-- ─── Territories ─────────────────────────────────────────────────────────────
create table public.territories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  parent_id  uuid references public.territories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── Inventory config (all unlimited & dynamic) ──────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  description text,
  location    text,
  status      text not null default 'active',
  media       jsonb not null default '[]'::jsonb,
  attrs       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  description text,
  attrs       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table public.property_types (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  code_prefix text not null,                 -- e.g. LD, PL, VL, AP — drives plot codes
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Commission / form / gamification / referral config ──────────────────────
-- commission_rules.formula resolved by the deterministic engine (P5). Money math
-- in NUMERIC here, evaluated with decimal.js client-side and in Edge Functions.
create table public.commission_rules (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  scope      text not null check (scope in ('property','project','plan','team','bonus','slab')),
  match      jsonb not null default '{}'::jsonb,   -- {project_id?, plan_id?, property_type_id?, role_id?}
  formula    jsonb not null default '{}'::jsonb,   -- {type:'percent'|'flat'|'slab', value, slabs[...]}
  currency   text not null default 'INR',
  priority   int  not null default 100,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_commission_rules_updated before update on public.commission_rules
  for each row execute function public.set_updated_at();

create table public.form_definitions (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,           -- buyer, agent, promoter, property, kyc, lead, booking
  name       text not null,
  fields     jsonb not null default '[]'::jsonb,   -- dynamic field schema (no hardcoded forms)
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_form_definitions_updated before update on public.form_definitions
  for each row execute function public.set_updated_at();

create table public.gamification_rules (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  name       text not null,
  config     jsonb not null default '{}'::jsonb,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.referral_rules (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  name       text not null,
  config     jsonb not null default '{}'::jsonb,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.system_config (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.system_config (key, value) values
  ('brand', '{"name":"JAMIN PROPERTIES","tagline":"Signature for Fortune","currency":"INR"}'::jsonb);
