-- 0075: lead capture triggers keep the user's free text (follow-up to 0074).
-- The chat subject, NRI notes, site-visit notes and requirement label were
-- stored on the source rows but dropped from the lead timeline summaries.
-- Same pattern as 0074: append ' — "text"' when non-empty, keep it in event
-- data, and backfill existing events where the source row is traceable.

-- 5.2 Live support chat: include the thread subject.
create or replace function public.lead_from_chat_thread() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.buyer_id, null, null, 'live_chat', null,
    'Started a live support chat'
      || case when nullif(btrim(coalesce(new.subject, '')), '') is null then ''
              else ' — "' || left(btrim(new.subject), 300) || '"' end,
    jsonb_strip_nulls(jsonb_build_object(
      'thread_id', new.id,
      'subject', nullif(btrim(coalesce(new.subject, '')), ''))));
  return new;
exception when others then return new;
end $$;

-- 5.4 NRI desk: include the request notes (+ nri_id so events stay traceable).
create or replace function public.lead_from_nri() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.user_id, new.name, new.phone, 'nri', null,
    'NRI ' || replace(new.kind, '_', ' ') || ' request from ' || coalesce(new.country, 'abroad')
      || case when nullif(btrim(coalesce(new.notes, '')), '') is null then ''
              else ' — "' || left(btrim(new.notes), 300) || '"' end,
    jsonb_strip_nulls(jsonb_build_object(
      'nri_id', new.id, 'country', new.country, 'kind', new.kind,
      'preferred_time', new.preferred_time,
      'notes', nullif(btrim(coalesce(new.notes, '')), ''))));
  return new;
exception when others then return new;
end $$;

-- 5.6 Site-visit bookings: include the visit notes.
create or replace function public.lead_from_visit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.buyer_id, null, null, 'site_visit', new.property_id,
    'Booked a site visit'
      || case when nullif(btrim(coalesce(new.notes, '')), '') is null then ''
              else ' — "' || left(btrim(new.notes), 300) || '"' end,
    jsonb_strip_nulls(jsonb_build_object(
      'visit_id', new.id, 'scheduled_at', new.scheduled_at,
      'notes', nullif(btrim(coalesce(new.notes, '')), ''))), 'visit');
  return new;
exception when others then return new;
end $$;

-- 5.7 Buyer requirements: include the requirement label.
create or replace function public.lead_from_requirement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.user_id, null, null, 'requirement', null,
    'Posted a requirement' || coalesce(' in ' || new.location, '')
      || case when nullif(btrim(coalesce(new.label, '')), '') is null then ''
              else ' — "' || left(btrim(new.label), 300) || '"' end,
    jsonb_strip_nulls(jsonb_build_object(
      'requirement_id', new.id, 'location', new.location,
      'budget_min', new.budget_min, 'budget_max', new.budget_max,
      'purpose', new.purpose,
      'label', nullif(btrim(coalesce(new.label, '')), ''))));
  return new;
exception when others then return new;
end $$;

-- Backfills (idempotent — each skips events that already carry the text).
update public.lead_events e
set summary = e.summary || ' — "' || left(btrim(t.subject), 300) || '"',
    data    = e.data || jsonb_build_object('subject', btrim(t.subject))
from public.chat_threads t
where (e.data->>'thread_id') = t.id::text
  and nullif(btrim(coalesce(t.subject, '')), '') is not null
  and not (e.data ? 'subject');

update public.lead_events e
set summary = e.summary || ' — "' || left(btrim(v.notes), 300) || '"',
    data    = e.data || jsonb_build_object('notes', btrim(v.notes))
from public.site_visits v
where (e.data->>'visit_id') = v.id::text
  and nullif(btrim(coalesce(v.notes, '')), '') is not null
  and not (e.data ? 'notes');

update public.lead_events e
set summary = e.summary || ' — "' || left(btrim(r.label), 300) || '"',
    data    = e.data || jsonb_build_object('label', btrim(r.label))
from public.buyer_requirements r
where (e.data->>'requirement_id') = r.id::text
  and nullif(btrim(coalesce(r.label, '')), '') is not null
  and not (e.data ? 'label');

-- (NRI events can't be backfilled — 0072 didn't store the request id in
--  event data. New NRI events carry nri_id + notes from now on.)
