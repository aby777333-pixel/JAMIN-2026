-- JAMIN Properties — 0050 collaborative shortlists + neighborhood scores.
-- A buyer creates a shared shortlist, invites family via a share code, and members
-- add properties, vote (👍/👎) and comment. Membership is checked via a SECURITY
-- DEFINER helper so RLS never recurses (per the project's RLS-recursion lesson).
-- Also adds project neighborhood scorecards. Fully additive.

-- ── tables ──────────────────────────────────────────────────────────────────
create table if not exists public.shortlists (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  share_token text not null unique default encode(gen_random_bytes(8), 'hex'),
  created_at  timestamptz not null default now()
);

create table if not exists public.shortlist_members (
  id           uuid primary key default gen_random_uuid(),
  shortlist_id uuid not null references public.shortlists(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner','member')),
  joined_at    timestamptz not null default now(),
  unique (shortlist_id, user_id)
);
create index if not exists idx_shortlist_members_sl on public.shortlist_members(shortlist_id);
create index if not exists idx_shortlist_members_user on public.shortlist_members(user_id);

create table if not exists public.shortlist_items (
  id           uuid primary key default gen_random_uuid(),
  shortlist_id uuid not null references public.shortlists(id) on delete cascade,
  property_id  uuid not null references public.properties(id) on delete cascade,
  added_by     uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (shortlist_id, property_id)
);
create index if not exists idx_shortlist_items_sl on public.shortlist_items(shortlist_id);

create table if not exists public.shortlist_votes (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid not null references public.shortlist_items(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  value     smallint not null check (value in (-1, 1)),
  unique (item_id, user_id)
);
create index if not exists idx_shortlist_votes_item on public.shortlist_votes(item_id);

create table if not exists public.shortlist_comments (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.shortlist_items(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_shortlist_comments_item on public.shortlist_comments(item_id);

-- ── membership helper (SECURITY DEFINER → policies don't recurse) ────────────
create or replace function public.is_shortlist_member(p_sl uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shortlist_members m where m.shortlist_id = p_sl and m.user_id = auth.uid())
      or exists (select 1 from public.shortlists s where s.id = p_sl and s.owner_id = auth.uid())
      or public.auth_is_admin();
$$;
revoke execute on function public.is_shortlist_member(uuid) from public, anon;
grant  execute on function public.is_shortlist_member(uuid) to authenticated;

create or replace function public.shortlist_id_for_item(p_item uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select shortlist_id from public.shortlist_items where id = p_item;
$$;
revoke execute on function public.shortlist_id_for_item(uuid) from public, anon;
grant  execute on function public.shortlist_id_for_item(uuid) to authenticated;

-- ── owner auto-membership ───────────────────────────────────────────────────
create or replace function public.add_shortlist_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.shortlist_members(shortlist_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (shortlist_id, user_id) do nothing;
  return new;
end $$;
revoke execute on function public.add_shortlist_owner() from public, anon, authenticated;
drop trigger if exists trg_add_shortlist_owner on public.shortlists;
create trigger trg_add_shortlist_owner after insert on public.shortlists
  for each row execute function public.add_shortlist_owner();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.shortlists         enable row level security;
alter table public.shortlist_members  enable row level security;
alter table public.shortlist_items    enable row level security;
alter table public.shortlist_votes    enable row level security;
alter table public.shortlist_comments enable row level security;

drop policy if exists shortlists_member_read on public.shortlists;
create policy shortlists_member_read on public.shortlists for select to authenticated
  using (public.is_shortlist_member(id));
drop policy if exists shortlists_insert on public.shortlists;
create policy shortlists_insert on public.shortlists for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists shortlists_owner_write on public.shortlists;
create policy shortlists_owner_write on public.shortlists for all to authenticated
  using (owner_id = auth.uid() or public.auth_is_admin())
  with check (owner_id = auth.uid() or public.auth_is_admin());

drop policy if exists shortlist_members_read on public.shortlist_members;
create policy shortlist_members_read on public.shortlist_members for select to authenticated
  using (public.is_shortlist_member(shortlist_id));
drop policy if exists shortlist_members_leave on public.shortlist_members;
create policy shortlist_members_leave on public.shortlist_members for delete to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());

drop policy if exists shortlist_items_read on public.shortlist_items;
create policy shortlist_items_read on public.shortlist_items for select to authenticated
  using (public.is_shortlist_member(shortlist_id));
drop policy if exists shortlist_items_add on public.shortlist_items;
create policy shortlist_items_add on public.shortlist_items for insert to authenticated
  with check (public.is_shortlist_member(shortlist_id) and added_by = auth.uid());
drop policy if exists shortlist_items_del on public.shortlist_items;
create policy shortlist_items_del on public.shortlist_items for delete to authenticated
  using (added_by = auth.uid() or public.is_shortlist_member(shortlist_id) and public.auth_is_admin()
         or exists (select 1 from public.shortlists s where s.id = shortlist_items.shortlist_id and s.owner_id = auth.uid()));

drop policy if exists shortlist_votes_rw on public.shortlist_votes;
create policy shortlist_votes_rw on public.shortlist_votes for all to authenticated
  using (public.is_shortlist_member(public.shortlist_id_for_item(item_id)))
  with check (user_id = auth.uid() and public.is_shortlist_member(public.shortlist_id_for_item(item_id)));

drop policy if exists shortlist_comments_read on public.shortlist_comments;
create policy shortlist_comments_read on public.shortlist_comments for select to authenticated
  using (public.is_shortlist_member(public.shortlist_id_for_item(item_id)));
drop policy if exists shortlist_comments_add on public.shortlist_comments;
create policy shortlist_comments_add on public.shortlist_comments for insert to authenticated
  with check (user_id = auth.uid() and public.is_shortlist_member(public.shortlist_id_for_item(item_id)));

grant select, insert, update, delete on public.shortlists, public.shortlist_members,
  public.shortlist_items, public.shortlist_votes, public.shortlist_comments to authenticated;

-- ── join by share code ──────────────────────────────────────────────────────
create or replace function public.join_shortlist(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_sl uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select id into v_sl from public.shortlists where share_token = p_token;
  if v_sl is null then raise exception 'invalid share code'; end if;
  insert into public.shortlist_members(shortlist_id, user_id, role)
  values (v_sl, v_self, 'member') on conflict (shortlist_id, user_id) do nothing;
  return v_sl;
end $$;
revoke execute on function public.join_shortlist(text) from public, anon;
grant  execute on function public.join_shortlist(text) to authenticated;

-- ── neighborhood scorecards on projects ─────────────────────────────────────
alter table public.projects add column if not exists neighborhood jsonb not null default '{}'::jsonb;
