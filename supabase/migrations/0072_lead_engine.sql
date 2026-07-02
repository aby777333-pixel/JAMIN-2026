-- JAMIN Properties — 0072 THE LEAD ENGINE (real leads portal, wired end-to-end).
-- Every buyer touchpoint now automatically becomes (or updates) a lead:
--   ad chats · live chat · live-agent calls · NRI requests · offers ·
--   site visits · buyer requirements · web signups · hot browsing (3+ days).
-- Leads de-duplicate per person, auto-assign round-robin from the routing pool
-- (fallback: first admin), notify the owner, log a unified timeline
-- (lead_events), and an SLA watchdog escalates stale leads + due follow-ups.
-- ALL capture triggers swallow their own errors so the original action can
-- NEVER fail because of lead capture (no-regressions mandate).

-- ── 1) Lead columns (additive) ───────────────────────────────────────────────
alter table public.leads add column if not exists user_id         uuid references public.profiles(id) on delete set null;
alter table public.leads add column if not exists lost_reason     text;
alter table public.leads add column if not exists last_touch_at   timestamptz not null default now();
alter table public.leads add column if not exists sla_notified_at timestamptz;
create index if not exists idx_leads_user  on public.leads(user_id);
create index if not exists idx_leads_phone on public.leads((contact->>'phone'));

alter table public.follow_ups add column if not exists notified_at timestamptz;

-- ── 2) Unified lead timeline ─────────────────────────────────────────────────
create table if not exists public.lead_events (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  kind       text not null,          -- created | ad_chat | live_chat | call_request | nri | offer | site_visit | requirement | web | browsing | note | status
  summary    text,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_events_lead on public.lead_events(lead_id, created_at desc);
alter table public.lead_events enable row level security;
drop policy if exists lead_events_read on public.lead_events;
create policy lead_events_read on public.lead_events for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id
                 and (l.owner_id = auth.uid() or public.auth_is_admin())));
grant select on public.lead_events to authenticated;
-- inserts happen only inside SECURITY DEFINER functions (table owner bypasses RLS)

-- ── 3) Round-robin owner picker (pool → fallback admin) ─────────────────────
create or replace function public.pick_pool_agent(p_territory uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb; v_pool jsonb; v_len int; v_cursor int; v_agent uuid; v_try int := 0; v_cand uuid;
begin
  select value into v_cfg from public.system_config where key = 'lead_routing';
  v_pool := coalesce(v_cfg->'pool', '[]'::jsonb);
  v_len := jsonb_array_length(v_pool);
  if v_len > 0 then
    v_cursor := coalesce((v_cfg->>'cursor')::int, 0);
    -- Territory preference: first pass tries pool agents in the same territory.
    if p_territory is not null then
      while v_try < v_len loop
        v_cand := (v_pool->>((v_cursor + v_try) % v_len))::uuid;
        if exists (select 1 from public.profiles p where p.id = v_cand and p.territory_id = p_territory) then
          v_agent := v_cand; v_cursor := v_cursor + v_try + 1; exit;
        end if;
        v_try := v_try + 1;
      end loop;
    end if;
    if v_agent is null then
      v_agent := (v_pool->>(v_cursor % v_len))::uuid;
      v_cursor := v_cursor + 1;
    end if;
    update public.system_config
      set value = jsonb_set(coalesce(v_cfg, '{}'::jsonb), '{cursor}', to_jsonb(v_cursor))
      where key = 'lead_routing';
    return v_agent;
  end if;
  -- Pool empty → first admin keeps the lead from being orphaned.
  select p.id into v_agent from public.profiles p
    join public.roles r on r.id = p.role_id
    where r.is_admin order by p.created_at limit 1;
  return v_agent;
end $$;

-- ── 4) capture_lead — dedup, create/upgrade, timeline, notify ────────────────
create or replace function public.capture_lead(
  p_user uuid, p_name text, p_phone text, p_source text,
  p_property uuid, p_summary text, p_data jsonb default '{}'::jsonb,
  p_stage text default 'new'
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_lead uuid; v_owner uuid; v_status text; v_rank int; v_new_rank int;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  -- Backfill identity from the profile when we have a user.
  if p_user is not null then
    select coalesce(v_name, full_name), coalesce(v_phone, phone)
      into v_name, v_phone from public.profiles where id = p_user;
  end if;

  -- De-dup: one OPEN lead per person (by user, else by phone).
  select id, status into v_lead, v_status from public.leads
    where status not in ('won', 'lost')
      and ((p_user is not null and user_id = p_user)
        or (v_phone is not null and contact->>'phone' = v_phone))
    order by created_at desc limit 1;

  if v_lead is not null then
    -- Existing open lead: log the touch, bump stage forward (never backward).
    v_rank := case v_status when 'new' then 1 when 'contacted' then 2 when 'qualified' then 3 when 'visit' then 4 else 5 end;
    v_new_rank := case p_stage when 'new' then 1 when 'contacted' then 2 when 'qualified' then 3 when 'visit' then 4 else 1 end;
    update public.leads set
      last_touch_at = now(),
      property_id = coalesce(property_id, p_property),
      user_id = coalesce(user_id, p_user),
      status = case when v_new_rank > v_rank then p_stage else status end,
      stage_changed_at = case when v_new_rank > v_rank then now() else stage_changed_at end
      where id = v_lead;
    insert into public.lead_events (lead_id, kind, summary, data)
      values (v_lead, p_source, p_summary, coalesce(p_data, '{}'::jsonb));
    return v_lead;
  end if;

  -- New lead: route it, record it, tell the owner.
  v_owner := public.pick_pool_agent();
  if v_owner is null then return null; end if;  -- no admins yet (bootstrap) — skip quietly
  insert into public.leads (owner_id, user_id, source, status, contact, property_id, last_touch_at, stage_changed_at)
    values (v_owner, p_user, p_source, coalesce(nullif(p_stage, ''), 'new'),
            jsonb_strip_nulls(jsonb_build_object('name', v_name, 'phone', v_phone)),
            p_property, now(), now())
    returning id into v_lead;
  insert into public.lead_events (lead_id, kind, summary, data)
    values (v_lead, 'created', coalesce(p_summary, 'Lead captured'),
            coalesce(p_data, '{}'::jsonb) || jsonb_build_object('source', p_source));
  perform public.notify(v_owner, 'lead', 'New lead assigned to you',
    coalesce(v_name, 'A buyer') || ' — ' || coalesce(p_summary, p_source),
    jsonb_build_object('lead_id', v_lead, 'source', p_source));
  return v_lead;
end $$;

-- ── 5) Source triggers (each body swallows every error) ─────────────────────
-- 5.1 Ad-page chats (visitor messages only)
create or replace function public.lead_from_ad_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sender is distinct from 'agent' then
    perform public.capture_lead(null, new.name, null, 'ad_chat', null,
      'Ad chat on /ad/' || coalesce(new.slug, '?') || ': ' || left(coalesce(new.body, ''), 120),
      jsonb_build_object('slug', new.slug));
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_lead_ad_message on public.ad_messages;
create trigger trg_lead_ad_message after insert on public.ad_messages
  for each row execute function public.lead_from_ad_message();

-- 5.2 Live support chat (new thread)
create or replace function public.lead_from_chat_thread() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.buyer_id, null, null, 'live_chat', null,
    'Started a live support chat', jsonb_build_object('thread_id', new.id));
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_lead_chat_thread on public.chat_threads;
create trigger trg_lead_chat_thread after insert on public.chat_threads
  for each row execute function public.lead_from_chat_thread();

-- 5.3 Live-agent call requests
create or replace function public.lead_from_call() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.room = 'live-agent' then
    perform public.capture_lead(null, new.initiator, null, 'call_request', new.property_id,
      'Asked to talk to a live agent', jsonb_build_object('kind', new.kind));
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_lead_call on public.call_logs;
create trigger trg_lead_call after insert on public.call_logs
  for each row execute function public.lead_from_call();

-- 5.4 NRI desk requests
create or replace function public.lead_from_nri() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.user_id, new.name, new.phone, 'nri', null,
    'NRI ' || replace(new.kind, '_', ' ') || ' request from ' || coalesce(new.country, 'abroad'),
    jsonb_build_object('country', new.country, 'kind', new.kind, 'preferred_time', new.preferred_time));
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_lead_nri on public.nri_requests;
create trigger trg_lead_nri after insert on public.nri_requests
  for each row execute function public.lead_from_nri();

-- 5.5 Offers → straight to "qualified"
create or replace function public.lead_from_offer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.buyer_id, null, null, 'offer', new.property_id,
    'Made an offer of ₹' || to_char(new.amount, 'FM99,99,99,999'),
    jsonb_build_object('offer_id', new.id, 'amount', new.amount), 'qualified');
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_lead_offer on public.offers;
create trigger trg_lead_offer after insert on public.offers
  for each row execute function public.lead_from_offer();

-- 5.6 Site-visit bookings → "visit"
create or replace function public.lead_from_visit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.buyer_id, null, null, 'site_visit', new.property_id,
    'Booked a site visit', jsonb_build_object('visit_id', new.id, 'scheduled_at', new.scheduled_at), 'visit');
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_lead_visit on public.site_visits;
create trigger trg_lead_visit after insert on public.site_visits
  for each row execute function public.lead_from_visit();

-- 5.7 Buyer requirements (radar)
create or replace function public.lead_from_requirement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.user_id, null, null, 'requirement', null,
    'Posted a requirement' || coalesce(' in ' || new.location, ''),
    jsonb_build_object('requirement_id', new.id, 'location', new.location,
                       'budget_min', new.budget_min, 'budget_max', new.budget_max));
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_lead_requirement on public.buyer_requirements;
create trigger trg_lead_requirement after insert on public.buyer_requirements
  for each row execute function public.lead_from_requirement();

-- 5.8 Marketing-site signups
create or replace function public.lead_from_web_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(null, new.name, new.phone, 'web', null,
    'Signed up on the website (' || coalesce(new.source, 'landing') || ')',
    jsonb_build_object('email', new.email, 'signup_source', new.source));
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_lead_web_signup on public.web_signups;
create trigger trg_lead_web_signup after insert on public.web_signups
  for each row execute function public.lead_from_web_signup();

-- 5.9 Hot browsing: 3rd day viewing the same property
create or replace function public.lead_from_browsing() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_days int;
begin
  if new.viewer_id is not null then
    select count(*) into v_days from public.property_views
      where property_id = new.property_id and viewer_id = new.viewer_id;
    if v_days = 3 then
      perform public.capture_lead(new.viewer_id, null, null, 'browsing', new.property_id,
        'Viewed this property on 3 different days — hot interest',
        jsonb_build_object('days', v_days));
    end if;
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_lead_browsing on public.property_views;
create trigger trg_lead_browsing after insert on public.property_views
  for each row execute function public.lead_from_browsing();

-- ── 6) SLA watchdog + follow-up reminders (cron + admin "run now") ───────────
create or replace function public.escalate_stale_leads()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_stale int := 0; v_due int := 0; r record;
begin
  for r in select l.id, l.owner_id, l.contact->>'name' as name from public.leads l
           where l.status = 'new' and l.last_touch_at < now() - interval '24 hours'
             and l.sla_notified_at is null
  loop
    perform public.notify(r.owner_id, 'lead', 'Lead waiting 24h+ — follow up',
      coalesce(r.name, 'A lead') || ' has had no action for over a day.',
      jsonb_build_object('lead_id', r.id, 'sla', true));
    update public.leads set sla_notified_at = now() where id = r.id;
    v_stale := v_stale + 1;
  end loop;

  for r in select f.id, f.note, f.due_at, l.owner_id, l.id as lead_id, l.contact->>'name' as name
           from public.follow_ups f join public.leads l on l.id = f.lead_id
           where f.status = 'pending' and f.due_at <= now() and f.notified_at is null
  loop
    perform public.notify(r.owner_id, 'lead', 'Follow-up due',
      coalesce(r.name, 'A lead') || ': ' || coalesce(r.note, 'follow up now'),
      jsonb_build_object('lead_id', r.lead_id, 'follow_up_id', r.id));
    update public.follow_ups set notified_at = now() where id = r.id;
    v_due := v_due + 1;
  end loop;
  return jsonb_build_object('stale_notified', v_stale, 'followups_notified', v_due);
end $$;
revoke execute on function public.escalate_stale_leads() from public, anon;
grant execute on function public.escalate_stale_leads() to authenticated;

-- Daily in-app digest to every admin (yesterday's leads by source + stale count).
create or replace function public.lead_daily_digest()
returns void language plpgsql security definer set search_path = public as $$
declare v_new int; v_stale int; v_by text; r record;
begin
  select count(*) into v_new from public.leads where created_at >= current_date - 1 and created_at < current_date;
  select count(*) into v_stale from public.leads where status = 'new' and last_touch_at < now() - interval '24 hours';
  select string_agg(src || ' ' || n, ' · ') into v_by from (
    select coalesce(source, '?') as src, count(*) as n from public.leads
    where created_at >= current_date - 1 and created_at < current_date group by 1 order by 2 desc) s;
  for r in select p.id from public.profiles p join public.roles ro on ro.id = p.role_id where ro.is_admin
  loop
    perform public.notify(r.id, 'digest', 'Leads digest',
      v_new || ' new yesterday' || coalesce(' (' || v_by || ')', '') || ' · ' || v_stale || ' waiting 24h+',
      jsonb_build_object('new', v_new, 'stale', v_stale));
  end loop;
end $$;

-- Enable pg_cron + schedule (guarded — never fails the migration).
do $$ begin
  begin
    create extension if not exists pg_cron;
  exception when others then raise notice 'pg_cron unavailable: %', sqlerrm; end;
  begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
      if not exists (select 1 from cron.job where jobname = 'jamin-lead-sla') then
        perform cron.schedule('jamin-lead-sla', '15 * * * *', 'select public.escalate_stale_leads()');
      end if;
      if not exists (select 1 from cron.job where jobname = 'jamin-lead-digest') then
        perform cron.schedule('jamin-lead-digest', '30 3 * * *', 'select public.lead_daily_digest()'); -- 09:00 IST
      end if;
      if not exists (select 1 from cron.job where jobname = 'jamin-drips') then
        perform cron.schedule('jamin-drips', '45 * * * *', 'select public.process_due_drips()');
      end if;
    end if;
  exception when others then raise notice 'cron scheduling skipped: %', sqlerrm; end;
end $$;

-- ── 7) Feature registry ──────────────────────────────────────────────────────
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('lead_engine',    'Lead Engine',        'Every buyer touchpoint (chats, calls, offers, visits, web) automatically becomes a routed, de-duplicated lead.', 'admin', 'flash', 57),
  ('lead_timeline',  'Lead Timeline',      'One thread per person: everything they viewed, asked, offered and booked.', 'admin', 'git-commit', 58),
  ('sla_watchdog',   'Lead SLA Watchdog',  'Stale leads and due follow-ups escalate automatically every hour.', 'admin', 'alarm', 59)
on conflict (key) do nothing;
