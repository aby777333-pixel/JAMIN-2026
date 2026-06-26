-- JAMIN Properties — 0035 live chat on shared ad pages.
-- A recipient viewing a shared ad (web/ad.html) can chat with the advertiser.
-- Messages are scoped to the ad's slug. Visitors are anonymous; the ad owner or
-- an admin replies from the Admin Portal (Ad chats). Polled by the page (no SDK).

create table if not exists public.ad_messages (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null references public.shared_ads(slug) on delete cascade,
  sender     text not null check (sender in ('visitor', 'agent')),
  name       text,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ad_messages_slug on public.ad_messages(slug, created_at);

alter table public.ad_messages enable row level security;

-- A shared ad is a public landing page, so its chat thread is readable by anyone
-- holding the (unguessable) slug — visitor sees the agent's replies and vice-versa.
drop policy if exists ad_messages_read on public.ad_messages;
create policy ad_messages_read on public.ad_messages
  for select to anon, authenticated using (true);

-- An (anonymous) visitor may post a visitor message.
drop policy if exists ad_messages_visitor_insert on public.ad_messages;
create policy ad_messages_visitor_insert on public.ad_messages
  for insert to anon, authenticated with check (sender = 'visitor');

-- The ad's owner (the advertiser) or an admin may post an agent reply.
drop policy if exists ad_messages_agent_insert on public.ad_messages;
create policy ad_messages_agent_insert on public.ad_messages
  for insert to authenticated with check (
    sender = 'agent' and (
      public.auth_is_admin()
      or exists (select 1 from public.shared_ads s where s.slug = ad_messages.slug and s.owner_id = auth.uid())
    )
  );

-- Owner/admin may tidy up threads.
drop policy if exists ad_messages_delete on public.ad_messages;
create policy ad_messages_delete on public.ad_messages
  for delete to authenticated using (
    public.auth_is_admin()
    or exists (select 1 from public.shared_ads s where s.slug = ad_messages.slug and s.owner_id = auth.uid())
  );

grant select, insert on public.ad_messages to anon, authenticated;
grant delete on public.ad_messages to authenticated;
