-- JAMIN Properties — 0016 AI generations log (§5.14, §9-10).
-- The ai-generate Edge Function (service role) writes here; users read their own.
-- AI is ONLY reachable via the Edge Function — the app never calls Anthropic directly.

create table public.ai_generations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  feature    text not null,
  input      jsonb not null default '{}'::jsonb,
  output     text,
  score      int,
  meta       jsonb not null default '{}'::jsonb,   -- {model, usage, ...}
  status     text not null default 'done',
  created_at timestamptz not null default now()
);
create index idx_ai_generations_user on public.ai_generations(user_id);

alter table public.ai_generations enable row level security;
create policy ai_generations_own on public.ai_generations for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
