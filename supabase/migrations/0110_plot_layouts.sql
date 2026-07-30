-- 0110: Interactive plot layouts — sanctioned DTCP plans as selectable inventory.
--
-- Additive only. Nothing here alters properties, bookings, bank_transfers or the
-- commission spine. In particular this module deliberately does NOT write to
-- public.bookings: that table carries trg_bazaar_process_sale, which accrues
-- DSI/RSI income on update, and a plot hold is not a sale. Layout bookings live
-- in their own table and an admin promotes them explicitly.
--
-- Payment note: JAMIN has no payment gateway (bank transfer only, see 0087).
-- A plot hold therefore records an *intent* to pay by UPI / NEFT / IMPS and is
-- settled by the existing bank_transfers review flow. Money never moves here.

create sequence if not exists public.layout_booking_seq;

-- ───────────────────────── layouts ─────────────────────────
create table if not exists public.layouts (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete set null,
  slug            text unique not null,
  name            text not null,
  -- title-block facts, transcribed from the sanctioned drawing
  authority       text,
  title           text,
  place           text,
  approval_no     text,
  approval_date   date,
  owner_name      text,
  survey_nos      text,
  village         text,
  taluk           text,
  district        text,
  scale           text,
  -- traced plan: boundary, OSR, roads, dimensions, area statement, notes.
  -- Held here (not only in app code) so a new layout is data, not a release.
  geometry        jsonb not null default '{}'::jsonb,
  amenities       jsonb not null default '[]'::jsonb,
  media           jsonb not null default '[]'::jsonb,
  documents       jsonb not null default '[]'::jsonb,
  brochure_url    text,
  maps_url        text,
  street_view_url text,
  latitude        numeric(10,6),
  longitude       numeric(10,6),
  landmarks       jsonb not null default '[]'::jsonb,
  promoter_id     uuid references public.profiles(id) on delete set null,
  -- how long a plot stays held while the buyer completes a manual transfer
  hold_minutes    int not null default 2880 check (hold_minutes between 15 and 20160),
  status          text not null default 'active' check (status in ('active','archived')),
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ───────────────────────── plots ─────────────────────────
create table if not exists public.layout_plots (
  id          uuid primary key default gen_random_uuid(),
  layout_id   uuid not null references public.layouts(id) on delete cascade,
  number      int not null,
  block       text not null,
  -- [x0,y0,x1,y1] in the drawing's own user space; display only, never for area
  rect        jsonb not null,
  width_m     numeric(10,2),
  depth_m     numeric(10,2),
  area_sqm    numeric(12,2),
  -- facing/corner are read off the plan, not stated on the DTCP sheet; admin-editable
  facing      text check (facing is null or facing in ('north','south','east','west')),
  is_corner   boolean not null default false,
  road_width_m numeric(6,2),
  status      text not null default 'available'
              check (status in ('available','reserved','booked','sold','blocked')),
  price                 numeric(18,2),
  offer_price           numeric(18,2),
  booking_amount        numeric(18,2),
  registration_charges  numeric(18,2) not null default 0,
  development_charges   numeric(18,2) not null default 0,
  total_cost  numeric(18,2) generated always as
                (coalesce(offer_price, price, 0) + registration_charges + development_charges) stored,
  media       jsonb not null default '[]'::jsonb,
  documents   jsonb not null default '[]'::jsonb,
  note        text,
  held_by     uuid references public.profiles(id) on delete set null,
  held_until  timestamptz,
  buyer_id    uuid references public.profiles(id) on delete set null,
  updated_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (layout_id, number)
);

create index if not exists layout_plots_layout_idx on public.layout_plots(layout_id, number);
create index if not exists layout_plots_status_idx on public.layout_plots(layout_id, status);
create index if not exists layout_plots_hold_idx   on public.layout_plots(held_until) where held_until is not null;

-- ───────────────────────── status history (append-only) ─────────────────────────
create table if not exists public.layout_plot_events (
  id          uuid primary key default gen_random_uuid(),
  plot_id     uuid not null references public.layout_plots(id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor_id    uuid,
  note        text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists layout_plot_events_plot_idx on public.layout_plot_events(plot_id, created_at desc);

-- ───────────────────────── holds / bookings ─────────────────────────
create table if not exists public.layout_bookings (
  id            uuid primary key default gen_random_uuid(),
  booking_ref   text unique not null
                default ('JL' || to_char(nextval('public.layout_booking_seq'), 'FM000000')),
  plot_id       uuid not null references public.layout_plots(id) on delete cascade,
  layout_id     uuid not null references public.layouts(id) on delete cascade,
  buyer_id      uuid not null references public.profiles(id) on delete cascade,
  amount        numeric(18,2) not null check (amount >= 0),
  payment_method text not null default 'bank_transfer'
                 check (payment_method in ('upi','bank_transfer','net_banking')),
  -- settled through the existing manual-transfer review flow (0087/0089)
  bank_transfer_id uuid references public.bank_transfers(id) on delete set null,
  status        text not null default 'held'
                check (status in ('held','confirmed','cancelled','expired')),
  expires_at    timestamptz,
  confirmed_at  timestamptz,
  confirmed_by  uuid,
  note          text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists layout_bookings_buyer_idx on public.layout_bookings(buyer_id, created_at desc);
create index if not exists layout_bookings_plot_idx  on public.layout_bookings(plot_id, created_at desc);
-- at most one live hold per plot
create unique index if not exists layout_bookings_live_idx
  on public.layout_bookings(plot_id) where status = 'held';

drop trigger if exists trg_layouts_updated on public.layouts;
create trigger trg_layouts_updated before update on public.layouts
  for each row execute function public.set_updated_at();
drop trigger if exists trg_layout_plots_updated on public.layout_plots;
create trigger trg_layout_plots_updated before update on public.layout_plots
  for each row execute function public.set_updated_at();
drop trigger if exists trg_layout_bookings_updated on public.layout_bookings;
create trigger trg_layout_bookings_updated before update on public.layout_bookings
  for each row execute function public.set_updated_at();

-- ───────────────────────── status history trigger ─────────────────────────
create or replace function public.layout_plot_log_status()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.layout_plot_events(plot_id, from_status, to_status, actor_id, note)
    values (new.id, old.status, new.status, auth.uid(), new.note);
  end if;
  return new;
end $$;

drop trigger if exists trg_layout_plot_status on public.layout_plots;
create trigger trg_layout_plot_status after update on public.layout_plots
  for each row execute function public.layout_plot_log_status();

-- ───────────────────────── expire stale holds ─────────────────────────
-- Called opportunistically on read and safe to run from pg_cron.
create or replace function public.expire_layout_holds()
returns int language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  with freed as (
    update public.layout_plots p
       set status = 'available', held_by = null, held_until = null
     where p.status = 'reserved' and p.held_until is not null and p.held_until < now()
    returning p.id
  )
  update public.layout_bookings b
     set status = 'expired'
    from freed
   where b.plot_id = freed.id and b.status = 'held';
  get diagnostics n = row_count;
  return n;
end $$;

-- ───────────────────────── public read model ─────────────────────────
-- One call powers the map for signed-out visitors and the web preview.
create or replace function public.layout_overview(p_slug text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare l public.layouts; result jsonb;
begin
  select * into l from public.layouts
   where slug = p_slug and status = 'active'
     and (is_published or public.auth_is_admin());
  if not found then return null; end if;

  select jsonb_build_object(
    'layout', jsonb_build_object(
      'id', l.id, 'slug', l.slug, 'name', l.name, 'authority', l.authority,
      'title', l.title, 'place', l.place, 'approvalNo', l.approval_no,
      'approvalDate', l.approval_date, 'owner', l.owner_name, 'surveyNos', l.survey_nos,
      'village', l.village, 'taluk', l.taluk, 'district', l.district, 'scale', l.scale,
      'geometry', l.geometry, 'amenities', l.amenities, 'media', l.media,
      'documents', l.documents, 'brochureUrl', l.brochure_url, 'mapsUrl', l.maps_url,
      'streetViewUrl', l.street_view_url, 'latitude', l.latitude, 'longitude', l.longitude,
      'landmarks', l.landmarks, 'holdMinutes', l.hold_minutes),
    'plots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'number', p.number, 'block', p.block, 'rect', p.rect,
        'widthM', p.width_m, 'depthM', p.depth_m, 'areaSqm', p.area_sqm,
        'facing', p.facing, 'isCorner', p.is_corner, 'roadWidthM', p.road_width_m,
        'status', p.status, 'price', p.price, 'offerPrice', p.offer_price,
        'bookingAmount', p.booking_amount, 'registrationCharges', p.registration_charges,
        'developmentCharges', p.development_charges, 'totalCost', p.total_cost,
        'media', p.media, 'documents', p.documents) order by p.number)
      from public.layout_plots p where p.layout_id = l.id), '[]'::jsonb),
    'summary', (
      select jsonb_build_object(
        'total', count(*),
        'available', count(*) filter (where status = 'available'),
        'reserved',  count(*) filter (where status = 'reserved'),
        'booked',    count(*) filter (where status = 'booked'),
        'sold',      count(*) filter (where status = 'sold'),
        'blocked',   count(*) filter (where status = 'blocked'))
      from public.layout_plots where layout_id = l.id)
  ) into result;
  return result;
end $$;

-- ───────────────────────── buyer: hold a plot ─────────────────────────
create or replace function public.reserve_layout_plot(
  p_plot uuid, p_method text default 'bank_transfer', p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare p public.layout_plots; l public.layouts; b public.layout_bookings; amt numeric;
begin
  if auth.uid() is null then
    raise exception 'Sign in to reserve a plot' using errcode = '28000';
  end if;
  if p_method not in ('upi','bank_transfer','net_banking') then
    raise exception 'Unsupported payment method %', p_method using errcode = '22023';
  end if;

  perform public.expire_layout_holds();

  -- lock the row so two buyers cannot take the same plot
  select * into p from public.layout_plots where id = p_plot for update;
  if not found then
    raise exception 'Plot not found' using errcode = 'P0002';
  end if;
  if p.status <> 'available' then
    raise exception 'Plot % is no longer available', p.number using errcode = '55006';
  end if;

  select * into l from public.layouts where id = p.layout_id;
  amt := coalesce(p.booking_amount, 0);

  update public.layout_plots
     set status = 'reserved', held_by = auth.uid(),
         held_until = now() + make_interval(mins => l.hold_minutes),
         updated_by = auth.uid()
   where id = p.id;

  insert into public.layout_bookings(plot_id, layout_id, buyer_id, amount, payment_method, expires_at, note)
  values (p.id, p.layout_id, auth.uid(), amt, p_method,
          now() + make_interval(mins => l.hold_minutes), p_note)
  returning * into b;

  perform public.bazaar_notify_admins(
    'layout_hold',
    'Plot ' || p.number || ' held',
    'Plot ' || p.number || ' in ' || l.name || ' is on hold pending payment.',
    jsonb_build_object('plotId', p.id, 'layoutId', l.id, 'bookingRef', b.booking_ref));

  return jsonb_build_object(
    'bookingRef', b.booking_ref, 'bookingId', b.id, 'plotId', p.id,
    'plotNumber', p.number, 'amount', amt, 'expiresAt', b.expires_at,
    'method', b.payment_method);
end $$;

-- Buyer may release their own hold.
create or replace function public.release_layout_plot(p_plot uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update public.layout_plots
     set status = 'available', held_by = null, held_until = null
   where id = p_plot and status = 'reserved'
     and (held_by = auth.uid() or public.auth_is_admin());
  if not found then
    raise exception 'No hold of yours on this plot' using errcode = '42501';
  end if;
  update public.layout_bookings set status = 'cancelled'
   where plot_id = p_plot and status = 'held';
end $$;

-- ───────────────────────── admin controls ─────────────────────────
create or replace function public.admin_set_layout_plot_status(
  p_plot uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare p public.layout_plots;
begin
  if not public.auth_is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if p_status not in ('available','reserved','booked','sold','blocked') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;

  select * into p from public.layout_plots where id = p_plot for update;
  if not found then raise exception 'Plot not found' using errcode = 'P0002'; end if;

  update public.layout_plots
     set status     = p_status,
         note       = coalesce(p_note, note),
         updated_by = auth.uid(),
         -- a plot leaving the held states drops its holder
         held_by    = case when p_status in ('available','blocked') then null else held_by end,
         held_until = case when p_status in ('available','blocked') then null else held_until end,
         buyer_id   = case when p_status in ('booked','sold') then coalesce(buyer_id, held_by) else buyer_id end
   where id = p_plot;

  if p_status in ('booked','sold') then
    update public.layout_bookings
       set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid()
     where plot_id = p_plot and status = 'held';
  elsif p_status = 'available' then
    update public.layout_bookings set status = 'cancelled'
     where plot_id = p_plot and status = 'held';
  end if;

  perform public.log_admin_action('layout_plot_status', 'layout_plots', p_plot,
    jsonb_build_object('from', p.status, 'to', p_status, 'note', p_note));
end $$;

-- Commercial + presentation fields. Geometry is intentionally NOT patchable:
-- the sanctioned plan is regenerated from the approval drawing, never edited.
create or replace function public.admin_update_layout_plot(p_plot uuid, p_patch jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.auth_is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update public.layout_plots set
    price                = coalesce((p_patch->>'price')::numeric, price),
    offer_price          = case when p_patch ? 'offerPrice'
                                then nullif(p_patch->>'offerPrice','')::numeric else offer_price end,
    booking_amount       = coalesce((p_patch->>'bookingAmount')::numeric, booking_amount),
    registration_charges = coalesce((p_patch->>'registrationCharges')::numeric, registration_charges),
    development_charges  = coalesce((p_patch->>'developmentCharges')::numeric, development_charges),
    facing               = coalesce(nullif(p_patch->>'facing',''), facing),
    is_corner            = coalesce((p_patch->>'isCorner')::boolean, is_corner),
    road_width_m         = coalesce((p_patch->>'roadWidthM')::numeric, road_width_m),
    media                = coalesce(p_patch->'media', media),
    documents            = coalesce(p_patch->'documents', documents),
    note                 = coalesce(p_patch->>'note', note),
    updated_by           = auth.uid()
  where id = p_plot;

  perform public.log_admin_action('layout_plot_update', 'layout_plots', p_plot, p_patch);
end $$;

-- Bulk pricing so an admin can price a whole block in one go.
create or replace function public.admin_price_layout_block(
  p_layout uuid, p_block text, p_patch jsonb)
returns int language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  if not public.auth_is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update public.layout_plots set
    price                = coalesce((p_patch->>'price')::numeric, price),
    offer_price          = case when p_patch ? 'offerPrice'
                                then nullif(p_patch->>'offerPrice','')::numeric else offer_price end,
    booking_amount       = coalesce((p_patch->>'bookingAmount')::numeric, booking_amount),
    registration_charges = coalesce((p_patch->>'registrationCharges')::numeric, registration_charges),
    development_charges  = coalesce((p_patch->>'developmentCharges')::numeric, development_charges),
    updated_by           = auth.uid()
  where layout_id = p_layout and (p_block is null or block = p_block);
  get diagnostics n = row_count;
  perform public.log_admin_action('layout_block_price', 'layouts', p_layout,
    jsonb_build_object('block', p_block, 'patch', p_patch, 'plots', n));
  return n;
end $$;

-- When a manual transfer tied to a plot hold is verified, confirm the plot.
-- Implemented as a NEW trigger rather than a change to review_bank_transfer so
-- the existing payments flow keeps its exact behaviour.
create or replace function public.layout_booking_on_transfer()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare b public.layout_bookings;
begin
  if new.status is distinct from old.status and new.status = 'verified' then
    select * into b from public.layout_bookings
     where bank_transfer_id = new.id and status = 'held' limit 1;
    if found then
      update public.layout_plots
         set status = 'booked', buyer_id = coalesce(buyer_id, b.buyer_id),
             held_until = null
       where id = b.plot_id;
      update public.layout_bookings
         set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid()
       where id = b.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_layout_booking_on_transfer on public.bank_transfers;
create trigger trg_layout_booking_on_transfer after update on public.bank_transfers
  for each row execute function public.layout_booking_on_transfer();

-- ───────────────────────── RLS ─────────────────────────
alter table public.layouts            enable row level security;
alter table public.layout_plots       enable row level security;
alter table public.layout_plot_events enable row level security;
alter table public.layout_bookings    enable row level security;

drop policy if exists layouts_read on public.layouts;
create policy layouts_read on public.layouts
  for select to anon, authenticated
  using ((is_published and status = 'active') or public.auth_is_admin());
drop policy if exists layouts_admin on public.layouts;
create policy layouts_admin on public.layouts
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

drop policy if exists layout_plots_read on public.layout_plots;
create policy layout_plots_read on public.layout_plots
  for select to anon, authenticated
  using (exists (select 1 from public.layouts l
                  where l.id = layout_id
                    and ((l.is_published and l.status = 'active') or public.auth_is_admin())));
drop policy if exists layout_plots_admin on public.layout_plots;
create policy layout_plots_admin on public.layout_plots
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

drop policy if exists layout_events_read on public.layout_plot_events;
create policy layout_events_read on public.layout_plot_events
  for select to authenticated using (public.auth_is_admin());

drop policy if exists layout_bookings_own on public.layout_bookings;
create policy layout_bookings_own on public.layout_bookings
  for select to authenticated using (buyer_id = auth.uid() or public.auth_is_admin());
drop policy if exists layout_bookings_admin on public.layout_bookings;
create policy layout_bookings_admin on public.layout_bookings
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

-- ───────────────────────── grants (2026-10-30 flip safe) ─────────────────────────
grant select on public.layouts to anon, authenticated;
grant insert, update, delete on public.layouts to authenticated;

-- Signed-out visitors get the plan and the availability colours, never the
-- people: held_by / buyer_id / updated_by / note stay out of the anon grant.
grant select (id, layout_id, number, block, rect, width_m, depth_m, area_sqm,
              facing, is_corner, road_width_m, status, price, offer_price,
              booking_amount, registration_charges, development_charges,
              total_cost, media, documents, created_at, updated_at)
  on public.layout_plots to anon;
grant select on public.layout_plots to authenticated;
grant insert, update, delete on public.layout_plots to authenticated;

grant select on public.layout_plot_events, public.layout_bookings to authenticated;
grant insert, update, delete on public.layout_bookings to authenticated;
grant usage on sequence public.layout_booking_seq to authenticated;

revoke all on public.layout_plot_events, public.layout_bookings from anon;

revoke execute on function public.reserve_layout_plot(uuid, text, text) from public, anon;
revoke execute on function public.release_layout_plot(uuid) from public, anon;
revoke execute on function public.admin_set_layout_plot_status(uuid, text, text) from public, anon;
revoke execute on function public.admin_update_layout_plot(uuid, jsonb) from public, anon;
revoke execute on function public.admin_price_layout_block(uuid, text, jsonb) from public, anon;
-- reserve_layout_plot calls this internally as a definer, so no client needs it
revoke execute on function public.expire_layout_holds() from public, anon, authenticated;
revoke execute on function public.layout_plot_log_status() from public, anon, authenticated;
revoke execute on function public.layout_booking_on_transfer() from public, anon, authenticated;
-- the read model is deliberately open: it powers the signed-out plan viewer
grant execute on function public.layout_overview(text) to anon, authenticated;

-- ───────────────────────── realtime ─────────────────────────
-- Every viewer's map repaints the moment a plot changes hands.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public'
                    and tablename = 'layout_plots') then
    alter publication supabase_realtime add table public.layout_plots;
  end if;
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public'
                    and tablename = 'layouts') then
    alter publication supabase_realtime add table public.layouts;
  end if;
end $$;
