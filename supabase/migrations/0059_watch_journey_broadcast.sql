-- JAMIN Properties — 0059 watch-a-listing, steps-to-buy tracker, broadcast.
-- (1) property_watches: follow one listing → alert on price/status change.
-- (2) buyer_journeys: a per-buyer purchase checklist (steps are dynamic config).
-- (3) broadcast_notification(): admin sends a targeted in-app notification to a
--     segment (reuses the existing notifications feed). All additive.

-- ── watch a listing ─────────────────────────────────────────────────────────
create table if not exists public.property_watches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, property_id)
);
create index if not exists idx_property_watches_prop on public.property_watches(property_id);
create index if not exists idx_property_watches_user on public.property_watches(user_id);

alter table public.property_watches enable row level security;
drop policy if exists property_watches_own on public.property_watches;
create policy property_watches_own on public.property_watches for all to authenticated
  using (user_id = auth.uid() or public.auth_is_admin())
  with check (user_id = auth.uid());
grant select, insert, update, delete on public.property_watches to authenticated;

-- Notify watchers when a watched listing changes price or status.
create or replace function public.notify_property_watchers()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text; v_body text;
begin
  if new.price is distinct from old.price then
    v_title := 'Price update on a property you follow';
    v_body  := 'The price changed to ₹' || trim(to_char(new.price, 'FM999999999990')) || '.';
  elsif new.status is distinct from old.status then
    v_title := 'Status update on a property you follow';
    v_body  := 'This listing is now ' || new.status || '.';
  else
    return null;
  end if;
  begin
    insert into public.notifications(user_id, type, title, body, data)
    select w.user_id, 'watch', v_title, v_body,
           jsonb_build_object('property_id', new.id, 'price', new.price, 'status', new.status)
    from public.property_watches w
    where w.property_id = new.id;
  exception when others then
    return null; -- never block a listing write
  end;
  return null;
end $$;
revoke execute on function public.notify_property_watchers() from public, anon, authenticated;
drop trigger if exists trg_notify_property_watchers on public.properties;
create trigger trg_notify_property_watchers after update of price, status on public.properties
  for each row execute function public.notify_property_watchers();

-- ── steps-to-buy tracker ────────────────────────────────────────────────────
create table if not exists public.buyer_journeys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  steps       jsonb not null default '{}'::jsonb,  -- { step_key: true }
  updated_at  timestamptz not null default now(),
  unique (user_id, property_id)
);
create index if not exists idx_buyer_journeys_user on public.buyer_journeys(user_id);
drop trigger if exists trg_buyer_journeys_updated on public.buyer_journeys;
create trigger trg_buyer_journeys_updated before update on public.buyer_journeys
  for each row execute function public.set_updated_at();

alter table public.buyer_journeys enable row level security;
drop policy if exists buyer_journeys_own on public.buyer_journeys;
create policy buyer_journeys_own on public.buyer_journeys for all to authenticated
  using (user_id = auth.uid() or public.auth_is_admin())
  with check (user_id = auth.uid());
grant select, insert, update, delete on public.buyer_journeys to authenticated;

-- Canonical buy steps (admin-editable in System config).
insert into public.system_config(key, value)
values ('buy_steps', jsonb_build_array(
  jsonb_build_object('key','enquiry','label','Enquiry made'),
  jsonb_build_object('key','visit','label','Site visit done'),
  jsonb_build_object('key','offer','label','Offer made'),
  jsonb_build_object('key','token','label','Token / booking paid'),
  jsonb_build_object('key','loan','label','Loan / funds ready'),
  jsonb_build_object('key','agreement','label','Agreement signed'),
  jsonb_build_object('key','registration','label','Registration done'),
  jsonb_build_object('key','handover','label','Possession / handover')
))
on conflict (key) do nothing;

-- ── admin broadcast to a segment ────────────────────────────────────────────
create or replace function public.broadcast_notification(p_title text, p_body text, p_segment text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.auth_is_admin() then raise exception 'not authorized'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'title required'; end if;
  if p_segment not in ('all','buyers','partners') then raise exception 'bad segment'; end if;

  insert into public.notifications(user_id, type, title, body, data)
  select pr.id, 'broadcast', p_title, coalesce(p_body, ''),
         jsonb_build_object('segment', p_segment)
  from public.profiles pr
  where p_segment = 'all'
     or (p_segment = 'partners' and exists (select 1 from public.roles r where r.id = pr.role_id and r.level <= 6))
     or (p_segment = 'buyers' and (pr.role_id is null
            or exists (select 1 from public.roles r where r.id = pr.role_id and r.level >= 7)));
  get diagnostics v_count = row_count;
  perform public.app_audit('broadcast.sent', 'notification', null::uuid, jsonb_build_object('segment', p_segment, 'count', v_count));
  return v_count;
end $$;
revoke execute on function public.broadcast_notification(text, text, text) from public, anon;
grant  execute on function public.broadcast_notification(text, text, text) to authenticated;
