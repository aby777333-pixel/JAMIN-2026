-- JAMIN Properties — 0044 AI / smart lead scoring.
-- Adds an explainable, deterministic scoring engine on top of the existing
-- leads.score column: a hot/warm/cold band (kept in sync by trigger), a factor
-- breakdown log, dynamic weights in system_config, and an on-demand score_lead()
-- RPC. The existing AI scoring path (callAI('lead_score') → setLeadScore) keeps
-- working unchanged; this never auto-overwrites a score. All additive.

-- ── band column + sync ──────────────────────────────────────────────────────
alter table public.leads add column if not exists score_band text;

create or replace function public.lead_score_band(p_score int)
returns text language sql immutable as $$
  select case
    when p_score is null then null
    when p_score >= 70 then 'hot'
    when p_score >= 40 then 'warm'
    else 'cold'
  end;
$$;

-- Keep score_band in lock-step with score on any write (manual, AI, or RPC).
create or replace function public.sync_lead_score_band()
returns trigger language plpgsql set search_path = public as $$
begin
  new.score_band := public.lead_score_band(new.score);
  return new;
end $$;
drop trigger if exists trg_sync_lead_score_band on public.leads;
create trigger trg_sync_lead_score_band before insert or update of score on public.leads
  for each row execute function public.sync_lead_score_band();

-- Backfill bands for existing leads (one-time, safe).
update public.leads set score_band = public.lead_score_band(score)
  where score_band is distinct from public.lead_score_band(score);

-- ── factor breakdown log ────────────────────────────────────────────────────
create table if not exists public.lead_score_factors (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.leads(id) on delete cascade,
  score         int not null,
  band          text,
  factors       jsonb not null default '{}'::jsonb,
  model_version text not null default 'rules-v1',
  computed_at   timestamptz not null default now()
);
create index if not exists idx_lead_score_factors_lead on public.lead_score_factors(lead_id, computed_at desc);

alter table public.lead_score_factors enable row level security;
drop policy if exists lead_score_factors_select on public.lead_score_factors;
create policy lead_score_factors_select on public.lead_score_factors for select to authenticated
  using (exists (
    select 1 from public.leads l
    where l.id = lead_score_factors.lead_id
      and (
        l.owner_id = auth.uid()
        or public.auth_is_admin()
        or exists (select 1 from public.profiles p
                   where p.id = l.owner_id
                     and p.hierarchy_path <@ public.auth_hierarchy_path())
      )
  ));
grant select on public.lead_score_factors to authenticated;

-- ── dynamic weights (admin-editable in System config) ───────────────────────
insert into public.system_config(key, value)
values ('lead_score_weights', jsonb_build_object(
  'status', jsonb_build_object('new',10,'contacted',30,'qualified',55,'visit',75,'won',100,'lost',0),
  'has_phone', 10,
  'followup_done', 15,
  'recency_fresh', 10,
  'recency_recent', 5,
  'has_value', 10
))
on conflict (key) do nothing;

-- ── deterministic scoring RPC (explainable) ─────────────────────────────────
create or replace function public.score_lead(p_lead uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_self     uuid := auth.uid();
  v_lead     public.leads%rowtype;
  v_w        jsonb;
  v_total    int;
  v_done     int;
  v_age_days numeric;
  v_status   numeric := 0;
  v_phone    numeric := 0;
  v_follow   numeric := 0;
  v_recency  numeric := 0;
  v_value    numeric := 0;
  v_score    int;
  v_band     text;
  v_factors  jsonb;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select * into v_lead from public.leads where id = p_lead;
  if v_lead.id is null then raise exception 'lead not found'; end if;
  -- Authorize: owner, subtree manager, or admin only.
  if not (
    v_lead.owner_id = v_self
    or public.auth_is_admin()
    or exists (select 1 from public.profiles p where p.id = v_lead.owner_id
               and p.hierarchy_path <@ public.auth_hierarchy_path())
  ) then
    raise exception 'not authorized';
  end if;

  select coalesce(value, '{}'::jsonb) into v_w from public.system_config where key = 'lead_score_weights';
  if v_w is null then v_w := '{}'::jsonb; end if;

  v_status := coalesce((v_w->'status'->>v_lead.status)::numeric, 0);
  if v_lead.contact ? 'phone' and length(coalesce(v_lead.contact->>'phone','')) > 0 then
    v_phone := coalesce((v_w->>'has_phone')::numeric, 0);
  end if;

  select count(*), count(*) filter (where status = 'done')
    into v_total, v_done from public.follow_ups where lead_id = p_lead;
  if v_total > 0 then
    v_follow := round((v_done::numeric / v_total) * coalesce((v_w->>'followup_done')::numeric, 0), 2);
  end if;

  v_age_days := extract(epoch from (now() - v_lead.created_at)) / 86400.0;
  if v_age_days <= 3 then
    v_recency := coalesce((v_w->>'recency_fresh')::numeric, 0);
  elsif v_age_days <= 14 then
    v_recency := coalesce((v_w->>'recency_recent')::numeric, 0);
  end if;

  if v_lead.value is not null and v_lead.value > 0 then
    v_value := coalesce((v_w->>'has_value')::numeric, 0);
  end if;

  v_score := least(100, greatest(0, round(v_status + v_phone + v_follow + v_recency + v_value)));
  v_band  := public.lead_score_band(v_score);
  v_factors := jsonb_build_object(
    'status', v_status, 'has_phone', v_phone, 'followups', v_follow,
    'recency', v_recency, 'has_value', v_value,
    'followups_total', v_total, 'followups_done', v_done
  );

  update public.leads set score = v_score where id = p_lead; -- band synced by trigger
  insert into public.lead_score_factors(lead_id, score, band, factors, model_version)
  values (p_lead, v_score, v_band, v_factors, 'rules-v1');

  return jsonb_build_object('score', v_score, 'band', v_band, 'factors', v_factors);
end $$;
revoke execute on function public.score_lead(uuid) from public, anon;
grant  execute on function public.score_lead(uuid) to authenticated;
