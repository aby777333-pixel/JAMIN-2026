-- JAMIN Properties — 0100 Buyer module enhancements (India):
-- buyer type, structured buyer preferences, saved searches (+ live match
-- notifications), private property notes, comparison + search analytics,
-- loan document upload, site-visit reminders (pg_cron). FULLY ADDITIVE.

-- ─── 1. Buyer type (Individual / Joint / NRI / Investor / Company…) ─────────
-- Plain text (no CHECK) per the "everything is dynamic" rule — new types need
-- zero migration. Self-editable: it is buyer-declared, not privileged.
alter table public.profiles
  add column if not exists buyer_type text not null default 'individual';

-- ─── 2. Buyer preferences — one jsonb doc per buyer ─────────────────────────
-- Keys (property type, budget, localities, facing, gated, corner, RERA-only,
-- verified-only, agri/non-agri, invest/self-use, beds, baths, …) live in the
-- doc, so new preference dimensions never need a schema change.
create table if not exists public.buyer_preferences (
  user_id    uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  prefs      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_buyer_prefs_updated on public.buyer_preferences;
create trigger trg_buyer_prefs_updated before update on public.buyer_preferences
  for each row execute function public.set_updated_at();
alter table public.buyer_preferences enable row level security;
drop policy if exists buyer_prefs_self on public.buyer_preferences;
create policy buyer_prefs_self on public.buyer_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists buyer_prefs_admin_read on public.buyer_preferences;
create policy buyer_prefs_admin_read on public.buyer_preferences for select to authenticated
  using (public.auth_is_admin());
grant select, insert, update, delete on public.buyer_preferences to authenticated;

-- ─── 3. Saved searches + new-listing match notifications ────────────────────
create table if not exists public.saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name       text not null,
  filters    jsonb not null default '{}'::jsonb,
  notify     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_saved_searches_user on public.saved_searches(user_id);
alter table public.saved_searches enable row level security;
drop policy if exists saved_searches_self on public.saved_searches;
create policy saved_searches_self on public.saved_searches for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists saved_searches_admin_read on public.saved_searches;
create policy saved_searches_admin_read on public.saved_searches for select to authenticated
  using (public.auth_is_admin());
grant select, insert, update, delete on public.saved_searches to authenticated;

-- When a listing becomes publicly visible (approved), notify every buyer whose
-- saved search matches on the structured criteria. Error-swallowed: listing
-- approval must never fail because of the matcher.
create or replace function public.match_saved_searches() returns trigger
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if new.approval_status <> 'approved' then return new; end if;
  if tg_op = 'UPDATE' and old.approval_status = 'approved' then return new; end if;
  for s in
    select ss.* from public.saved_searches ss
    where ss.notify
      and (ss.filters->>'propertyTypeId' is null or ss.filters->>'propertyTypeId' = new.property_type_id::text)
      and (ss.filters->>'projectId'      is null or ss.filters->>'projectId'      = new.project_id::text)
      and (ss.filters->>'priceMin' is null or new.price >= (ss.filters->>'priceMin')::numeric)
      and (ss.filters->>'priceMax' is null or new.price <= (ss.filters->>'priceMax')::numeric)
    limit 200
  loop
    perform public.notify(s.user_id, 'match',
      'New property matches "' || s.name || '"',
      coalesce(new.plot_code, 'A new listing') || ' just went live — tap to view.',
      jsonb_build_object('property_id', new.id, 'saved_search_id', s.id));
  end loop;
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_match_saved_searches on public.properties;
create trigger trg_match_saved_searches after insert or update of approval_status on public.properties
  for each row execute function public.match_saved_searches();

-- ─── 4. Private buyer notes per property (note/rating/photos/voice/checklist) ─
-- PRIVATE by design: self-only RLS, no admin read — these are the buyer's own
-- site-visit impressions. Admin analytics use the capture tables instead.
create table if not exists public.property_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  note        text,
  rating      int check (rating between 1 and 5),
  photos      jsonb not null default '[]'::jsonb,
  voice_url   text,
  checklist   jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (user_id, property_id)
);
drop trigger if exists trg_property_notes_updated on public.property_notes;
create trigger trg_property_notes_updated before update on public.property_notes
  for each row execute function public.set_updated_at();
alter table public.property_notes enable row level security;
drop policy if exists property_notes_self on public.property_notes;
create policy property_notes_self on public.property_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.property_notes to authenticated;

-- ─── 5. Comparison + search analytics (admin engagement view) ───────────────
create table if not exists public.compare_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  property_ids uuid[] not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_compare_events_user on public.compare_events(user_id);
alter table public.compare_events enable row level security;
drop policy if exists compare_events_insert on public.compare_events;
create policy compare_events_insert on public.compare_events for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists compare_events_read on public.compare_events;
create policy compare_events_read on public.compare_events for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
grant insert, select on public.compare_events to authenticated;

create table if not exists public.search_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  query      text,
  filters    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_search_events_user on public.search_events(user_id);
alter table public.search_events enable row level security;
drop policy if exists search_events_insert on public.search_events;
create policy search_events_insert on public.search_events for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists search_events_read on public.search_events;
create policy search_events_read on public.search_events for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
grant insert, select on public.search_events to authenticated;

-- ─── 6. Loan documents (preliminary, optional) ───────────────────────────────
-- Appended through a definer RPC so buyers can attach documents WITHOUT gaining
-- update rights on status or any other application column.
alter table public.loan_applications
  add column if not exists docs jsonb not null default '[]'::jsonb;
create or replace function public.attach_loan_docs(p_application uuid, p_docs jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if jsonb_typeof(coalesce(p_docs, '[]'::jsonb)) <> 'array' then raise exception 'docs must be an array'; end if;
  update public.loan_applications
     set docs = docs || p_docs
   where id = p_application and user_id = auth.uid();
  if not found then raise exception 'application not found'; end if;
end $$;
revoke execute on function public.attach_loan_docs(uuid, jsonb) from public, anon;
grant execute on function public.attach_loan_docs(uuid, jsonb) to authenticated;

-- ─── 7. Site-visit reminders (implements the 0046 config key) ────────────────
alter table public.site_visits
  add column if not exists reminded_at timestamptz;
create or replace function public.remind_upcoming_visits()
returns void language plpgsql security definer set search_path = public as $$
declare v record; mins int;
begin
  -- config values are bare jsonb scalars ('60'::jsonb) — same read as 0046.
  select value::text::int into mins
    from public.system_config where key = 'site_visit_reminder_minutes';
  mins := coalesce(mins, 60);
  for v in
    select sv.id, sv.buyer_id, sv.agent_id, sv.scheduled_at, p.plot_code
      from public.site_visits sv
      left join public.properties p on p.id = sv.property_id
     where sv.status in ('requested', 'confirmed')
       and sv.reminded_at is null
       and sv.scheduled_at between now() and now() + make_interval(mins => mins)
     limit 100
  loop
    perform public.notify(v.buyer_id, 'site_visit', 'Site visit coming up',
      'Your visit' || coalesce(' to ' || v.plot_code, '') || ' is at ' ||
      to_char(v.scheduled_at at time zone 'Asia/Kolkata', 'HH12:MI AM') || ' today.',
      jsonb_build_object('visit_id', v.id));
    perform public.notify(v.agent_id, 'site_visit', 'Site visit coming up',
      'A buyer visit' || coalesce(' to ' || v.plot_code, '') || ' is at ' ||
      to_char(v.scheduled_at at time zone 'Asia/Kolkata', 'HH12:MI AM') || ' today.',
      jsonb_build_object('visit_id', v.id));
    update public.site_visits set reminded_at = now() where id = v.id;
  end loop;
exception when others then null;
end $$;
do $$
begin
  begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
      if not exists (select 1 from cron.job where jobname = 'jamin-visit-reminders') then
        perform cron.schedule('jamin-visit-reminders', '*/15 * * * *', 'select public.remind_upcoming_visits()');
      end if;
    end if;
  exception when others then raise notice 'cron scheduling skipped: %', sqlerrm; end;
end $$;

-- ─── 8. Realtime for the admin activity radar ───────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['saved_searches', 'compare_events'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime'
                     and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ─── 9. Feature registry entries (admin → Features) ─────────────────────────
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('buyer_preferences', 'Buyer Preferences',  'Buyers save what they want — type, budget, locality, facing, gated, RERA-only — and recommendations follow.', 'buyer', 'options', 172),
  ('saved_searches',    'Saved Searches',     'Save any filter combination; buyers are notified the moment a matching listing goes live.', 'buyer', 'bookmark', 174),
  ('buyer_notes',       'Private Buyer Notes', 'Per-property private notes, star rating, photos, voice memo and checklist — visible only to the buyer.', 'buyer', 'create', 176),
  ('buyer_hub',         'Buyer Dashboard',    'One place for recently viewed, saved, visits, brochures, searches, comparisons and recommendations.', 'buyer', 'grid', 178)
on conflict (key) do nothing;
