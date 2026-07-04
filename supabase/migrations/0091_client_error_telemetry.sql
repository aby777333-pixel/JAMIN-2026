-- 0091: client-side crash telemetry. The app's root ErrorBoundary + global
-- error handler report fatal JS errors here, so "the app closed on tap" is
-- diagnosable from the admin instead of invisible.
create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  message text not null,
  stack text,
  context text,
  fatal boolean not null default true,
  platform text,
  app_version text,
  created_at timestamptz not null default now()
);
alter table public.client_errors enable row level security;

drop policy if exists client_errors_insert on public.client_errors;
create policy client_errors_insert on public.client_errors
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists client_errors_admin_read on public.client_errors;
create policy client_errors_admin_read on public.client_errors
  for select to authenticated using (public.auth_is_admin());

grant insert on public.client_errors to anon, authenticated;
grant select on public.client_errors to authenticated;

alter publication supabase_realtime add table public.client_errors;
