-- JAMIN Properties — 0046 site-visit booking + geofenced check-in.
-- Buyers book a visit on a listing; the listing agent confirms; a geofenced
-- check-in (haversine vs the property's coordinates, radius from system_config)
-- proves attendance and protects commission. All writes go through SECURITY
-- DEFINER RPCs; reads are scoped to the buyer / agent / admin. Fully additive.

-- ── agent availability windows ──────────────────────────────────────────────
create table if not exists public.agent_availability (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.profiles(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  start_time time not null,
  end_time   time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists idx_agent_avail_agent on public.agent_availability(agent_id);

alter table public.agent_availability enable row level security;
drop policy if exists agent_avail_read on public.agent_availability;
create policy agent_avail_read on public.agent_availability for select to authenticated using (true);
drop policy if exists agent_avail_write on public.agent_availability;
create policy agent_avail_write on public.agent_availability for all to authenticated
  using (agent_id = auth.uid() or public.auth_is_admin())
  with check (agent_id = auth.uid() or public.auth_is_admin());
grant select, insert, update, delete on public.agent_availability to authenticated;

-- ── site visits ─────────────────────────────────────────────────────────────
create table if not exists public.site_visits (
  id                 uuid primary key default gen_random_uuid(),
  property_id        uuid not null references public.properties(id) on delete cascade,
  lead_id            uuid references public.leads(id) on delete set null,
  buyer_id           uuid references public.profiles(id) on delete set null,
  buyer_contact      jsonb not null default '{}'::jsonb,
  agent_id           uuid references public.profiles(id) on delete set null,
  scheduled_at       timestamptz not null,
  status             text not null default 'requested'
                       check (status in ('requested','confirmed','checked_in','completed','no_show','cancelled')),
  checkin_at         timestamptz,
  checkin_lat        numeric,
  checkin_lng        numeric,
  checkin_distance_m numeric,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_site_visits_property on public.site_visits(property_id);
create index if not exists idx_site_visits_agent    on public.site_visits(agent_id);
create index if not exists idx_site_visits_buyer    on public.site_visits(buyer_id);
create index if not exists idx_site_visits_sched    on public.site_visits(scheduled_at);
drop trigger if exists trg_site_visits_updated on public.site_visits;
create trigger trg_site_visits_updated before update on public.site_visits
  for each row execute function public.set_updated_at();

alter table public.site_visits enable row level security;
-- Read: the buyer, the assigned agent, a manager above the agent, or an admin.
drop policy if exists site_visits_select on public.site_visits;
create policy site_visits_select on public.site_visits for select to authenticated
  using (
    buyer_id = auth.uid()
    or agent_id = auth.uid()
    or public.auth_is_admin()
    or exists (select 1 from public.profiles p where p.id = site_visits.agent_id
               and p.hierarchy_path <@ public.auth_hierarchy_path())
  );
grant select on public.site_visits to authenticated;  -- writes via RPC only

-- ── config: geofence radius + reminder window (dynamic, admin-editable) ──────
insert into public.system_config(key, value) values
  ('site_visit_geofence_m', '150'::jsonb),
  ('site_visit_reminder_minutes', '60'::jsonb)
on conflict (key) do nothing;

-- ── book a visit (buyer) ────────────────────────────────────────────────────
create or replace function public.book_site_visit(
  p_property uuid, p_scheduled_at timestamptz, p_note text default null, p_contact jsonb default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_agent uuid; v_id uuid; v_contact jsonb; v_name text; v_phone text;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  if p_scheduled_at is null or p_scheduled_at <= now() then raise exception 'pick a future time'; end if;
  if not exists (select 1 from public.properties where id = p_property) then raise exception 'property not found'; end if;

  select seller_id into v_agent from public.properties where id = p_property;
  if p_contact is not null then
    v_contact := p_contact;
  else
    select full_name, phone into v_name, v_phone from public.profiles where id = v_self;
    v_contact := jsonb_strip_nulls(jsonb_build_object('name', v_name, 'phone', v_phone));
  end if;

  insert into public.site_visits(property_id, buyer_id, agent_id, scheduled_at, notes, buyer_contact, status)
  values (p_property, v_self, v_agent, p_scheduled_at, p_note, coalesce(v_contact, '{}'::jsonb), 'requested')
  returning id into v_id;

  if v_agent is not null and v_agent <> v_self then
    insert into public.notifications(user_id, type, title, body, data)
    values (v_agent, 'site_visit', 'New site-visit request',
            'A buyer requested a property visit.',
            jsonb_build_object('site_visit_id', v_id, 'property_id', p_property, 'scheduled_at', p_scheduled_at));
  end if;
  perform public.app_audit('site_visit.requested', 'site_visit', v_id,
          jsonb_build_object('property_id', p_property, 'scheduled_at', p_scheduled_at));
  return v_id;
end $$;
revoke execute on function public.book_site_visit(uuid, timestamptz, text, jsonb) from public, anon;
grant  execute on function public.book_site_visit(uuid, timestamptz, text, jsonb) to authenticated;

-- ── change status (agent/admin: confirm/complete/no_show; buyer: cancel) ─────
create or replace function public.set_site_visit_status(p_visit uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_agent uuid; v_buyer uuid; v_prop uuid; v_is_mgr boolean;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  if p_status not in ('requested','confirmed','checked_in','completed','no_show','cancelled') then
    raise exception 'bad status';
  end if;
  select agent_id, buyer_id, property_id into v_agent, v_buyer, v_prop from public.site_visits where id = p_visit;
  if v_prop is null then raise exception 'visit not found'; end if;
  v_is_mgr := public.auth_is_admin() or v_agent = v_self
    or exists (select 1 from public.profiles p where p.id = v_agent and p.hierarchy_path <@ public.auth_hierarchy_path());

  -- Buyers may only cancel their own visit; agents/managers/admins may do anything else.
  if p_status = 'cancelled' then
    if not (v_is_mgr or v_buyer = v_self) then raise exception 'not authorized'; end if;
  else
    if not v_is_mgr then raise exception 'not authorized'; end if;
  end if;

  update public.site_visits set status = p_status where id = p_visit;

  -- Notify the counterpart.
  if v_self = v_buyer and v_agent is not null then
    insert into public.notifications(user_id, type, title, body, data)
    values (v_agent, 'site_visit', 'Site visit ' || p_status, 'A site visit was ' || p_status || '.',
            jsonb_build_object('site_visit_id', p_visit, 'property_id', v_prop, 'status', p_status));
  elsif v_buyer is not null then
    insert into public.notifications(user_id, type, title, body, data)
    values (v_buyer, 'site_visit', 'Site visit ' || p_status, 'Your site visit was ' || p_status || '.',
            jsonb_build_object('site_visit_id', p_visit, 'property_id', v_prop, 'status', p_status));
  end if;
  perform public.app_audit('site_visit.' || p_status, 'site_visit', p_visit, '{}'::jsonb);
end $$;
revoke execute on function public.set_site_visit_status(uuid, text) from public, anon;
grant  execute on function public.set_site_visit_status(uuid, text) to authenticated;

-- ── geofenced check-in (buyer or agent) ─────────────────────────────────────
create or replace function public.checkin_site_visit(p_visit uuid, p_lat numeric, p_lng numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_self uuid := auth.uid(); v_agent uuid; v_buyer uuid; v_prop uuid;
  v_coords jsonb; v_plat numeric; v_plng numeric; v_dist numeric; v_radius numeric; v_ok boolean;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select agent_id, buyer_id, property_id into v_agent, v_buyer, v_prop from public.site_visits where id = p_visit;
  if v_prop is null then raise exception 'visit not found'; end if;
  if not (v_self = v_buyer or v_self = v_agent or public.auth_is_admin()
          or exists (select 1 from public.profiles p where p.id = v_agent and p.hierarchy_path <@ public.auth_hierarchy_path())) then
    raise exception 'not authorized';
  end if;

  v_radius := coalesce((select value::text::numeric from public.system_config where key = 'site_visit_geofence_m'), 150);
  select coordinates into v_coords from public.properties where id = v_prop;
  v_plat := nullif(v_coords->>'lat','')::numeric;
  v_plng := nullif(v_coords->>'lng','')::numeric;

  if v_plat is not null and v_plng is not null and p_lat is not null and p_lng is not null then
    v_dist := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_lat - v_plat) / 2), 2)
      + cos(radians(v_plat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_plng) / 2), 2)
    ));
    v_ok := v_dist <= v_radius;
  else
    v_dist := null;            -- no property geo recorded → accept the check-in
    v_ok := true;
  end if;

  update public.site_visits
    set checkin_lat = p_lat, checkin_lng = p_lng, checkin_distance_m = round(v_dist),
        checkin_at = now(),
        status = case when v_ok then 'checked_in' else status end
    where id = p_visit;

  perform public.app_audit('site_visit.checkin', 'site_visit', p_visit,
          jsonb_build_object('ok', v_ok, 'distance_m', round(v_dist), 'radius_m', v_radius));
  return jsonb_build_object('ok', v_ok, 'distance_m', round(v_dist), 'radius_m', v_radius);
end $$;
revoke execute on function public.checkin_site_visit(uuid, numeric, numeric) from public, anon;
grant  execute on function public.checkin_site_visit(uuid, numeric, numeric) to authenticated;
