-- JAMIN Properties — 0092 agent activity → unified lead timeline.
-- "How do I track what the assigned agent is doing?" — the admin CRM Details
-- drawer and the app's lead Timeline both read lead_events, but only BUYER
-- touchpoints ever wrote there (0072). Agent work was invisible: stage moves
-- went only to lead_stage_events (which no screen displays), and deal edits /
-- follow-ups were logged nowhere. Now every agent/admin action writes a
-- readable timeline entry naming the actor, and bumps last_touch_at so the
-- 24h SLA watchdog measures real inactivity instead of only buyer touches.
-- All logging swallows its own errors — the underlying action can never fail
-- because of it (same rule as 0072's capture triggers). Purely additive:
-- lead_stage_events keeps receiving the same immutable audit rows as before.

-- Actor suffix for timeline summaries ('' when unknown, e.g. cron).
create or replace function public.lead_actor_suffix()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(' — by ' || (select full_name from public.profiles where id = auth.uid()), '');
$$;

-- ── 1) Stage moves: extend 0043's trigger to ALSO write the visible timeline ─
create or replace function public.log_lead_stage_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.stage_changed_at := now();
    new.last_touch_at := now(); -- working the stage counts as a touch (SLA accuracy)
    begin
      insert into public.lead_stage_events(lead_id, from_status, to_status, actor_id)
      values (new.id, old.status, new.status, auth.uid());
    exception when others then
      null; -- logging must never block a lead update
    end;
    begin
      insert into public.lead_events(lead_id, kind, summary, data)
      values (new.id, 'stage',
              'Stage: ' || coalesce(old.status, '—') || ' → ' || new.status
                || case when new.status = 'lost' and new.lost_reason is not null
                        then ' (' || new.lost_reason || ')' else '' end
                || public.lead_actor_suffix(),
              jsonb_strip_nulls(jsonb_build_object(
                'from', old.status, 'to', new.status, 'by', auth.uid()::text,
                'lost_reason', case when new.status = 'lost' then new.lost_reason end)));
    exception when others then
      null;
    end;
  end if;
  return new;
end $$;
-- (trigger trg_log_lead_stage_change from 0043 already points at this function)

-- ── 2) Deal edits (value / expected close) ───────────────────────────────────
create or replace function public.log_lead_deal_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.value is distinct from old.value
                        or new.expected_close is distinct from old.expected_close) then
    new.last_touch_at := now();
    begin
      insert into public.lead_events(lead_id, kind, summary, data)
      values (new.id, 'deal',
              'Deal updated: '
                || case when new.value is null then 'value cleared'
                        else 'value ₹' || to_char(new.value, 'FM99,99,99,99,990.##') end
                || case when new.expected_close is null then ''
                        else ' · expected close ' || to_char(new.expected_close, 'DD Mon YYYY') end
                || public.lead_actor_suffix(),
              jsonb_strip_nulls(jsonb_build_object(
                'value', new.value, 'expected_close', new.expected_close, 'by', auth.uid()::text)));
    exception when others then
      null;
    end;
  end if;
  return new;
end $$;
drop trigger if exists trg_log_lead_deal_change on public.leads;
create trigger trg_log_lead_deal_change before update on public.leads
  for each row execute function public.log_lead_deal_change();

-- ── 3) Follow-ups scheduled / completed / reopened ───────────────────────────
create or replace function public.log_followup_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_summary text;
begin
  begin
    if tg_op = 'INSERT' then
      v_summary := 'Follow-up scheduled: ' || coalesce(new.note, 'follow up')
        || ' (due ' || to_char(new.due_at at time zone 'Asia/Kolkata', 'DD Mon, HH24:MI') || ' IST)';
    elsif new.status is distinct from old.status then
      v_summary := case when new.status = 'done' then 'Follow-up completed: '
                        else 'Follow-up reopened: ' end || coalesce(new.note, 'follow up');
    else
      return new; -- e.g. the SLA watchdog stamping notified_at
    end if;
    insert into public.lead_events(lead_id, kind, summary, data)
    values (new.lead_id, 'follow_up', v_summary || public.lead_actor_suffix(),
            jsonb_strip_nulls(jsonb_build_object(
              'follow_up_id', new.id::text, 'status', new.status, 'by', auth.uid()::text)));
    update public.leads set last_touch_at = now() where id = new.lead_id;
    return new;
  exception when others then
    return new; -- the follow-up itself must always succeed
  end;
end $$;
drop trigger if exists trg_log_followup_activity on public.follow_ups;
create trigger trg_log_followup_activity after insert or update on public.follow_ups
  for each row execute function public.log_followup_activity();
