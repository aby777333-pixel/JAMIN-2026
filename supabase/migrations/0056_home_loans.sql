-- JAMIN Properties — 0056 home-loan / pre-approval marketplace.
-- Admin curates lenders; buyers submit a pre-approval enquiry which lands in the
-- admin console (and can be routed to a lender). Contact stays platform-mediated.
-- Fully additive.

create table if not exists public.lenders (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  logo_url         text,
  interest_from    numeric(5,2),
  max_tenure_years int,
  blurb            text,
  active           boolean not null default true,
  sort_order       int not null default 100,
  created_at       timestamptz not null default now()
);

create table if not exists public.loan_applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  lender_id      uuid references public.lenders(id) on delete set null,
  property_id    uuid references public.properties(id) on delete set null,
  amount         numeric(18,2),
  tenure_years   int,
  monthly_income numeric(18,2),
  status         text not null default 'submitted' check (status in ('submitted','contacted','approved','rejected')),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_loan_apps_user on public.loan_applications(user_id);
create index if not exists idx_loan_apps_status on public.loan_applications(status);
drop trigger if exists trg_loan_apps_updated on public.loan_applications;
create trigger trg_loan_apps_updated before update on public.loan_applications
  for each row execute function public.set_updated_at();

alter table public.lenders            enable row level security;
alter table public.loan_applications  enable row level security;

drop policy if exists lenders_read on public.lenders;
create policy lenders_read on public.lenders for select to authenticated using (active or public.auth_is_admin());
drop policy if exists lenders_admin on public.lenders;
create policy lenders_admin on public.lenders for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

drop policy if exists loan_apps_own on public.loan_applications;
create policy loan_apps_own on public.loan_applications for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
drop policy if exists loan_apps_insert on public.loan_applications;
create policy loan_apps_insert on public.loan_applications for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists loan_apps_admin on public.loan_applications;
create policy loan_apps_admin on public.loan_applications for update to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

grant select, insert, update, delete on public.lenders to authenticated;
grant select, insert, update on public.loan_applications to authenticated;
