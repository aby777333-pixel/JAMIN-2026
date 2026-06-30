-- JAMIN Properties — 0051 co-broking marketplace + lead auto-routing.
-- Co-broking: an agent posts a listing they'll share with another agent for a
-- commission split; other agents express interest, the poster accepts/declines.
-- Lead routing: admin/manager round-robin assignment over a configurable agent
-- pool (assignment-side only — never touches the lead INSERT path / its RLS).
-- Fully additive.

-- ── co-broking ──────────────────────────────────────────────────────────────
create table if not exists public.cobroke_listings (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  posted_by   uuid not null references public.profiles(id) on delete cascade,
  split_pct   numeric(5,2) not null check (split_pct >= 0 and split_pct <= 100),
  note        text,
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now(),
  unique (property_id, posted_by)
);
create index if not exists idx_cobroke_status on public.cobroke_listings(status);

create table if not exists public.cobroke_interests (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.cobroke_listings(id) on delete cascade,
  agent_id   uuid not null references public.profiles(id) on delete cascade,
  message    text,
  status     text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (listing_id, agent_id)
);
create index if not exists idx_cobroke_interests_listing on public.cobroke_interests(listing_id);

alter table public.cobroke_listings  enable row level security;
alter table public.cobroke_interests enable row level security;

-- Marketplace listings are readable by any signed-in user; poster/admin manage.
drop policy if exists cobroke_read on public.cobroke_listings;
create policy cobroke_read on public.cobroke_listings for select to authenticated using (true);
drop policy if exists cobroke_insert on public.cobroke_listings;
create policy cobroke_insert on public.cobroke_listings for insert to authenticated
  with check (posted_by = auth.uid());
drop policy if exists cobroke_manage on public.cobroke_listings;
create policy cobroke_manage on public.cobroke_listings for all to authenticated
  using (posted_by = auth.uid() or public.auth_is_admin())
  with check (posted_by = auth.uid() or public.auth_is_admin());

-- Interests: the interested agent, the listing's poster, or admin can read.
drop policy if exists cobroke_int_read on public.cobroke_interests;
create policy cobroke_int_read on public.cobroke_interests for select to authenticated
  using (
    agent_id = auth.uid() or public.auth_is_admin()
    or exists (select 1 from public.cobroke_listings l where l.id = cobroke_interests.listing_id and l.posted_by = auth.uid())
  );
drop policy if exists cobroke_int_insert on public.cobroke_interests;
create policy cobroke_int_insert on public.cobroke_interests for insert to authenticated
  with check (agent_id = auth.uid());

grant select, insert, update, delete on public.cobroke_listings to authenticated;
grant select, insert, update, delete on public.cobroke_interests to authenticated;

-- Express interest → notify poster.
create or replace function public.express_cobroke_interest(p_listing uuid, p_message text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_poster uuid; v_prop uuid; v_id uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select posted_by, property_id into v_poster, v_prop from public.cobroke_listings where id = p_listing and status = 'open';
  if v_poster is null then raise exception 'listing not available'; end if;
  if v_poster = v_self then raise exception 'that is your own listing'; end if;
  insert into public.cobroke_interests(listing_id, agent_id, message)
  values (p_listing, v_self, p_message)
  on conflict (listing_id, agent_id) do update set message = excluded.message
  returning id into v_id;
  insert into public.notifications(user_id, type, title, body, data)
  values (v_poster, 'cobroke', 'New co-broke interest', 'An agent is interested in co-broking your listing.',
          jsonb_build_object('listing_id', p_listing, 'property_id', v_prop));
  return v_id;
end $$;
revoke execute on function public.express_cobroke_interest(uuid, text) from public, anon;
grant  execute on function public.express_cobroke_interest(uuid, text) to authenticated;

-- Poster accepts / declines an interest → notify the agent.
create or replace function public.respond_cobroke_interest(p_interest uuid, p_decision text)
returns void language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_poster uuid; v_agent uuid; v_listing uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  if p_decision not in ('accepted','declined') then raise exception 'bad decision'; end if;
  select i.listing_id, i.agent_id, l.posted_by into v_listing, v_agent, v_poster
    from public.cobroke_interests i join public.cobroke_listings l on l.id = i.listing_id
    where i.id = p_interest;
  if v_listing is null then raise exception 'interest not found'; end if;
  if not (v_poster = v_self or public.auth_is_admin()) then raise exception 'not authorized'; end if;
  update public.cobroke_interests set status = p_decision where id = p_interest;
  if p_decision = 'accepted' then
    update public.cobroke_listings set status = 'closed' where id = v_listing;
  end if;
  insert into public.notifications(user_id, type, title, body, data)
  values (v_agent, 'cobroke', 'Co-broke ' || p_decision, 'Your co-broke interest was ' || p_decision || '.',
          jsonb_build_object('listing_id', v_listing, 'decision', p_decision));
  perform public.app_audit('cobroke.' || p_decision, 'cobroke_interest', p_interest, '{}'::jsonb);
end $$;
revoke execute on function public.respond_cobroke_interest(uuid, text) from public, anon;
grant  execute on function public.respond_cobroke_interest(uuid, text) to authenticated;

-- ── lead routing (assignment-side only) ─────────────────────────────────────
insert into public.system_config(key, value)
values ('lead_routing', jsonb_build_object('enabled', false, 'pool', '[]'::jsonb, 'cursor', 0))
on conflict (key) do nothing;

-- Manual / assisted reassignment (admin or a manager above the current owner).
create or replace function public.route_lead(p_lead uuid, p_agent uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_owner uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select owner_id into v_owner from public.leads where id = p_lead;
  if not (public.auth_is_admin()
          or exists (select 1 from public.profiles p where p.id = v_owner and p.hierarchy_path <@ public.auth_hierarchy_path())) then
    raise exception 'not authorized';
  end if;
  update public.leads set owner_id = p_agent where id = p_lead;
  insert into public.notifications(user_id, type, title, body, data)
  values (p_agent, 'lead', 'A lead was assigned to you', 'You have a new lead to follow up.',
          jsonb_build_object('lead_id', p_lead));
  perform public.app_audit('lead.routed', 'lead', p_lead, jsonb_build_object('to', p_agent));
end $$;
revoke execute on function public.route_lead(uuid, uuid) from public, anon;
grant  execute on function public.route_lead(uuid, uuid) to authenticated;

-- Round-robin auto-assign from the configured pool (admin only).
create or replace function public.auto_assign_lead(p_lead uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb; v_pool jsonb; v_cursor int; v_len int; v_agent uuid;
begin
  if not public.auth_is_admin() then raise exception 'not authorized'; end if;
  select value into v_cfg from public.system_config where key = 'lead_routing';
  v_pool := coalesce(v_cfg->'pool', '[]'::jsonb);
  v_len := jsonb_array_length(v_pool);
  if v_len = 0 then raise exception 'no agents in the routing pool'; end if;
  v_cursor := coalesce((v_cfg->>'cursor')::int, 0);
  v_agent := (v_pool->>(v_cursor % v_len))::uuid;
  update public.system_config set value = jsonb_set(value, '{cursor}', to_jsonb(v_cursor + 1)) where key = 'lead_routing';
  perform public.route_lead(p_lead, v_agent);
  return v_agent;
end $$;
revoke execute on function public.auto_assign_lead(uuid) from public, anon;
grant  execute on function public.auto_assign_lead(uuid) to authenticated;
