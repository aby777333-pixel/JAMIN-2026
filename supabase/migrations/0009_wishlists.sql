-- JAMIN Properties — 0009 buyer wishlist (§5.04). Cross-device, RLS own-only.

create table public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, property_id)
);
create index idx_wishlists_user on public.wishlists(user_id);

alter table public.wishlists enable row level security;
create policy wishlists_own on public.wishlists for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
