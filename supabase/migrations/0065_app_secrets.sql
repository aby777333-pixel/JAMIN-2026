-- JAMIN Properties — 0065 server-only secrets table.
-- Holds sensitive tokens (e.g. Replicate) that Edge Functions read via the
-- service role when an env secret isn't set. RLS is enabled with NO policies and
-- no grants, so anon/authenticated can never read it; only the service role
-- (which bypasses RLS) can. Values are inserted out-of-band, never in git.
create table if not exists public.app_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
-- Intentionally NO policies → deny all for anon/authenticated.
revoke all on public.app_secrets from anon, authenticated;
