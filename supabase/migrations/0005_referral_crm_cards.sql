-- JAMIN Properties — 0005 referral engine, CRM, bookings, cards, notifications, audit.

-- Viral referral engine (§8): click -> register -> hierarchy, with fraud signals.
create table public.referral_events (
  id            uuid primary key default gen_random_uuid(),
  sharer_id     uuid references public.profiles(id) on delete set null,
  artifact_type text not null check (artifact_type in ('card','brochure','ad','link')),
  token         text,
  channel       text,
  prospect_id   uuid references public.profiles(id) on delete set null,
  stage         text not null default 'shared'
                  check (stage in ('shared','clicked','registered','verified','assigned')),
  device        jsonb not null default '{}'::jsonb,
  geo           jsonb,
  fraud_score   numeric(5,2) not null default 0,
  created_at    timestamptz not null default now()
);
create index idx_referral_events_sharer on public.referral_events(sharer_id);

-- CRM
create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  source      text,
  status      text not null default 'new',
  contact     jsonb not null default '{}'::jsonb,
  property_id uuid references public.properties(id) on delete set null,
  score       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_leads_owner on public.leads(owner_id);
create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

create table public.follow_ups (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  due_at     timestamptz not null,
  note       text,
  status     text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Bookings & payments
create table public.bookings (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  buyer_id    uuid references public.profiles(id) on delete set null,
  agent_id    uuid references public.profiles(id) on delete set null,
  status      text not null default 'pending',
  amount      numeric(18,2) not null default 0,
  schedule    timestamptz,
  created_at  timestamptz not null default now()
);

create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount     numeric(18,2) not null default 0,
  status     text not null default 'pending',
  method     text,
  txn_ref    text,
  created_at timestamptz not null default now()
);

-- Digital Business Card (§6) + analytics
create table public.card_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  config     jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.business_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique not null references public.profiles(id) on delete cascade,
  template_id uuid references public.card_templates(id) on delete set null,
  fields      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_business_cards_updated before update on public.business_cards
  for each row execute function public.set_updated_at();

create table public.card_shares (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.business_cards(id) on delete cascade,
  channel    text,
  token      text,
  created_at timestamptz not null default now()
);

create table public.card_scans (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.business_cards(id) on delete cascade,
  scanner_id uuid references public.profiles(id) on delete set null,
  geo        jsonb,
  device     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Notifications (§11)
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on public.notifications(user_id);

-- Immutable audit log (§13)
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  uuid,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create trigger trg_audit_immutable
  before update or delete on public.audit_logs
  for each row execute function public.prevent_ledger_mutation();
