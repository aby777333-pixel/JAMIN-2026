-- JAMIN Properties — 0043 deal pipeline (CRM kanban).
-- Adds expected deal value / close date / stage timestamp to leads, an immutable
-- stage-change event log (for velocity + audit), and a pipeline summary RPC that
-- naturally respects the existing leads RLS (own + subtree + admin). All additive,
-- regression-safe: no existing column/policy is dropped or repurposed.

-- ── lead enrichment (additive columns) ──────────────────────────────────────
alter table public.leads add column if not exists value            numeric(18,2);
alter table public.leads add column if not exists expected_close   date;
alter table public.leads add column if not exists stage_changed_at timestamptz not null default now();

-- ── stage-change event log ──────────────────────────────────────────────────
create table if not exists public.lead_stage_events (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor_id    uuid,
  created_at  timestamptz not null default now()
);
create index if not exists idx_lead_stage_events_lead on public.lead_stage_events(lead_id);

alter table public.lead_stage_events enable row level security;
-- Visible whenever the parent lead is visible (mirrors the leads_owner policy).
drop policy if exists lead_stage_events_select on public.lead_stage_events;
create policy lead_stage_events_select on public.lead_stage_events for select to authenticated
  using (exists (
    select 1 from public.leads l
    where l.id = lead_stage_events.lead_id
      and (
        l.owner_id = auth.uid()
        or public.auth_is_admin()
        or exists (select 1 from public.profiles p
                   where p.id = l.owner_id
                     and p.hierarchy_path <@ public.auth_hierarchy_path())
      )
  ));
grant select on public.lead_stage_events to authenticated;

-- ── trigger: stamp stage_changed_at + log the transition on every status change ─
create or replace function public.log_lead_stage_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.stage_changed_at := now();
    begin
      insert into public.lead_stage_events(lead_id, from_status, to_status, actor_id)
      values (new.id, old.status, new.status, auth.uid());
    exception when others then
      null; -- logging must never block a lead update
    end;
  end if;
  return new;
end $$;
drop trigger if exists trg_log_lead_stage_change on public.leads;
create trigger trg_log_lead_stage_change before update on public.leads
  for each row execute function public.log_lead_stage_change();

-- ── pipeline summary (SECURITY INVOKER → respects caller's leads RLS scope) ────
-- Returns one row per stage for the leads the caller can see (own pipeline for an
-- agent; whole subtree for a manager; everything for an admin).
create or replace function public.pipeline_summary()
returns table (status text, lead_count bigint, total_value numeric)
language sql stable security invoker set search_path = public as $$
  select status, count(*)::bigint, coalesce(sum(value), 0)::numeric
  from public.leads
  group by status;
$$;
grant execute on function public.pipeline_summary() to authenticated;
