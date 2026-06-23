-- JAMIN Properties — 0019 landing-page test signups (web only; isolated table).
-- Anonymous visitors can INSERT (the public form); only admins can read.
create table public.web_signups (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  phone      text,
  source     text not null default 'landing',
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.web_signups enable row level security;

create policy web_signups_insert on public.web_signups for insert to anon, authenticated
  with check (true);
create policy web_signups_admin_read on public.web_signups for select to authenticated
  using (public.auth_is_admin());

grant insert on public.web_signups to anon, authenticated;
grant select on public.web_signups to authenticated;
