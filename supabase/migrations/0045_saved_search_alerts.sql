-- JAMIN Properties — 0045 saved-search alerts (extends the 0039 buyer radar).
-- Adds: (1) a deduped match log so a buyer is alerted once per property/reason and
-- admins get demand analytics; (2) PRICE-DROP alerts on already-listed properties
-- (0039 only fired for brand-new listings); (3) a demand rollup RPC. The original
-- new-listing radar keeps working — it is re-pointed at a shared helper that also
-- logs matches. Fully additive & regression-safe.

-- ── match log (dedupe + demand analytics) ───────────────────────────────────
create table if not exists public.requirement_matches (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.buyer_requirements(id) on delete cascade,
  property_id    uuid not null references public.properties(id) on delete cascade,
  reason         text not null check (reason in ('new_listing','price_drop')),
  created_at     timestamptz not null default now(),
  unique (requirement_id, property_id, reason)
);
create index if not exists idx_req_matches_req on public.requirement_matches(requirement_id);
create index if not exists idx_req_matches_prop on public.requirement_matches(property_id);

alter table public.requirement_matches enable row level security;
-- The owning buyer (or admin) can read their matches. Inserts happen only through
-- the SECURITY DEFINER radar helper (no insert policy → blocked for normal roles).
drop policy if exists req_matches_select on public.requirement_matches;
create policy req_matches_select on public.requirement_matches for select to authenticated
  using (exists (
    select 1 from public.buyer_requirements r
    where r.id = requirement_matches.requirement_id
      and (r.user_id = auth.uid() or public.auth_is_admin())
  ));
grant select on public.requirement_matches to authenticated;

-- ── shared radar helper: log + notify newly-matched buyers for a reason ──────
create or replace function public.radar_notify(p_property uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_loc text; v_price numeric; v_type uuid; v_seller uuid;
begin
  select p.price, p.property_type_id, p.seller_id, pr.location
    into v_price, v_type, v_seller, v_loc
  from public.properties p
  left join public.projects pr on pr.id = p.project_id
  where p.id = p_property;
  if v_price is null then return; end if;

  with ins as (
    insert into public.requirement_matches(requirement_id, property_id, reason)
    select r.id, p_property, p_reason
    from public.buyer_requirements r
    where r.notify = true
      and v_price >= coalesce(r.budget_min, 0)
      and v_price <= coalesce(r.budget_max, 9e18)
      and (r.property_type_id is null or r.property_type_id = v_type)
      and (r.location is null or r.location = ''
           or (v_loc is not null and v_loc ilike '%' || r.location || '%'))
      and r.user_id <> coalesce(v_seller, '00000000-0000-0000-0000-000000000000'::uuid)
    on conflict (requirement_id, property_id, reason) do nothing
    returning requirement_id
  )
  insert into public.notifications(user_id, type, title, body, data)
  select r.user_id, 'match',
         case p_reason when 'price_drop' then 'Price drop on a property you want'
                       else 'New property matches your requirement' end,
         case p_reason when 'price_drop' then 'A matching listing just dropped in price.'
                       else 'A new listing matches what you''re looking for.' end,
         jsonb_build_object('property_id', p_property, 'requirement_id', r.id, 'reason', p_reason)
  from ins join public.buyer_requirements r on r.id = ins.requirement_id;
exception when others then
  return; -- radar must never block a property write
end $$;

-- ── re-point the original new-listing radar at the shared helper ─────────────
create or replace function public.notify_matching_buyers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not (new.approval_status = 'approved' and new.status = 'available') then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.approval_status = 'approved' and old.status = 'available' then
    return null;
  end if;
  perform public.radar_notify(new.id, 'new_listing');
  return null;
end $$;
-- trigger trg_notify_matching_buyers already exists from 0039; function is replaced in place.

-- ── price-drop radar: alert when an active listing's price falls ─────────────
create or replace function public.notify_price_drop()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.approval_status = 'approved' and new.status = 'available'
     and new.price is not null and old.price is not null and new.price < old.price then
    perform public.radar_notify(new.id, 'price_drop');
  end if;
  return null;
end $$;
drop trigger if exists trg_notify_price_drop on public.properties;
create trigger trg_notify_price_drop after update of price on public.properties
  for each row execute function public.notify_price_drop();

-- ── demand rollup (admin-only via guard; SECURITY DEFINER) ───────────────────
create or replace function public.requirement_demand()
returns table (location text, requirement_count bigint, with_budget bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(location), ''), '(any area)') as location,
         count(*)::bigint,
         count(*) filter (where budget_max is not null or budget_min is not null)::bigint
  from public.buyer_requirements
  where public.auth_is_admin()   -- non-admins get zero rows
  group by 1
  order by 2 desc
  limit 50;
$$;
revoke execute on function public.requirement_demand() from public, anon;
grant  execute on function public.requirement_demand() to authenticated;
