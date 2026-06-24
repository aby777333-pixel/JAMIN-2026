-- JAMIN Properties — 0025 Viral Referral Engine completion (MOD08) + brochure photo (MOD07).
-- ADDITIVE ONLY. Adds: campaigns table, referral_events.campaign_id, device-aware fraud
-- scoring trigger, campaign-aware click logging, and a per-user referral funnel RPC.
-- No existing function, table or policy is dropped or has its behaviour changed.

-- ─── MOD08 · campaigns (DB-driven, owned by the sharer; admin sees all) ───
create table if not exists public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  slug          text unique not null,
  artifact_type text not null default 'link'
                  check (artifact_type in ('card','brochure','ad','link')),
  channel       text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_campaigns_owner on public.campaigns(owner_id);

alter table public.campaigns enable row level security;
create policy campaigns_owner on public.campaigns for all to authenticated
  using (owner_id = auth.uid() or public.auth_is_admin())
  with check (owner_id = auth.uid() or public.auth_is_admin());
-- anon may read active campaigns so the web invite page can attribute a slug.
create policy campaigns_anon_read on public.campaigns for select to anon
  using (active);

grant select, insert, update, delete on public.campaigns to authenticated;
grant select on public.campaigns to anon;

-- ─── MOD08 · tag every referral event with an optional campaign ───
alter table public.referral_events
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
create index if not exists idx_referral_events_campaign on public.referral_events(campaign_id);

-- ─── MOD08/16 · device-aware fraud scoring (config-driven via referral_rules.fraud_controls) ───
-- SECURITY DEFINER so velocity counts see all rows regardless of the caller's RLS scope.
create or replace function public.compute_referral_fraud(
  p_sharer uuid, p_prospect uuid, p_device jsonb, p_stage text)
returns numeric
language plpgsql stable security definer set search_path = public as $$
declare
  v_cfg   jsonb;
  v_max   int;
  v_score numeric := 0;
  v_dev   text := nullif(p_device->>'id', '');
  v_cnt   int;
begin
  select config into v_cfg from public.referral_rules where key = 'fraud_controls' and active limit 1;
  v_max := coalesce((v_cfg->>'max_signups_per_device_per_day')::int, 5);

  -- Self-referral (same person on both ends) — hard signal.
  if p_sharer is not null and p_prospect is not null and p_sharer = p_prospect
     and coalesce((v_cfg->>'block_self_referral')::boolean, true) then
    v_score := v_score + 100;
  end if;

  -- Device velocity: too many conversions from one device in 24h.
  if v_dev is not null and p_stage in ('registered','verified','assigned') then
    select count(*) into v_cnt from public.referral_events
      where device->>'id' = v_dev
        and stage in ('registered','verified','assigned')
        and created_at > now() - interval '24 hours';
    if v_cnt >= v_max then v_score := v_score + 50; end if;
  end if;

  -- A conversion stage with no device fingerprint at all is mildly suspicious.
  if v_dev is null and p_stage in ('registered','verified','assigned') then
    v_score := v_score + 10;
  end if;

  return least(v_score, 100);
end $$;

create or replace function public.tg_referral_fraud()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only auto-score when the caller hasn't already supplied a non-zero score.
  if coalesce(new.fraud_score, 0) = 0 then
    new.fraud_score := public.compute_referral_fraud(
      new.sharer_id, new.prospect_id, coalesce(new.device, '{}'::jsonb), new.stage);
  end if;
  return new;
end $$;

drop trigger if exists trg_referral_fraud on public.referral_events;
create trigger trg_referral_fraud before insert on public.referral_events
  for each row execute function public.tg_referral_fraud();

-- These two are internal (the trigger fires them) — never call them via the API.
-- Match the 0008/0018 hardening pattern: strip the default PUBLIC execute grant.
revoke execute on function public.compute_referral_fraud(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.tg_referral_fraud() from public, anon, authenticated;

-- ─── MOD08 · campaign-aware click logging (5-arg overload; the 4-arg version is untouched) ───
create or replace function public.log_referral_click(
  p_code text, p_artifact text, p_channel text, p_device jsonb, p_campaign text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_sharer uuid; v_campaign uuid;
begin
  if p_code is null or length(trim(p_code)) = 0 then return false; end if;
  select id into v_sharer from public.profiles where lower(referral_code) = lower(trim(p_code)) limit 1;
  if v_sharer is null then return false; end if;
  if p_campaign is not null and length(trim(p_campaign)) > 0 then
    select id into v_campaign from public.campaigns where slug = trim(p_campaign) and active limit 1;
  end if;
  insert into public.referral_events (sharer_id, artifact_type, token, channel, stage, device, campaign_id)
  values (v_sharer, coalesce(p_artifact, 'link'), upper(trim(p_code)), coalesce(p_channel, 'link'),
          'clicked', coalesce(p_device, '{}'::jsonb), v_campaign);
  return true;
end $$;
grant execute on function public.log_referral_click(text, text, text, jsonb, text) to anon, authenticated;

-- ─── MOD08 · per-user referral funnel (share → click → register → verify → assign) ───
create or replace function public.referral_funnel(p_days int default 30)
returns jsonb
language sql stable security definer set search_path = public as $$
  with ev as (
    select stage, fraud_score from public.referral_events
    where sharer_id = auth.uid()
      and created_at > now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
  )
  select jsonb_build_object(
    'shared',     (select count(*) from ev where stage = 'shared'),
    'clicked',    (select count(*) from ev where stage = 'clicked'),
    'registered', (select count(*) from ev where stage = 'registered'),
    'verified',   (select count(*) from ev where stage = 'verified'),
    'assigned',   (select count(*) from ev where stage = 'assigned'),
    'flagged',    (select count(*) from ev where fraud_score >= 50),
    'total',      (select count(*) from ev)
  );
$$;
grant execute on function public.referral_funnel(int) to authenticated;
