-- 0077: buyer listing alerts + App Content keys for the new Home surfaces.
-- (1) New available listings and price drops notify buyers whose saved
--     requirements match (budget + optional property type). Trigger bodies
--     swallow errors so property writes can never fail because of alerts.
-- (2) app_content seeds so the web admin can edit/toggle the new features
--     (existing 📝 App Content tab picks these up automatically).

-- ── 1) Requirement matching ─────────────────────────────────────────────────
create or replace function public.notify_requirement_matches(
  p_property uuid, p_price numeric, p_type uuid, p_title text, p_body text
) returns void language plpgsql security definer set search_path = public as $$
declare r record; v_enabled text;
begin
  select value into v_enabled from public.app_content where key = 'alerts.listing_enabled';
  if coalesce(v_enabled, 'on') = 'off' then return; end if;

  for r in
    select distinct user_id from public.buyer_requirements
    where notify = true
      and (budget_min is null or p_price >= budget_min)
      and (budget_max is null or p_price <= budget_max)
      and (property_type_id is null or property_type_id = p_type)
      and user_id is not null
  loop
    perform public.notify(r.user_id, 'listing', p_title, p_body,
      jsonb_build_object('property_id', p_property, 'kind', 'requirement_match'));
  end loop;
end $$;

create or replace function public.alert_new_listing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'available' then
    perform public.notify_requirement_matches(
      new.id, new.price, new.property_type_id,
      'New property matches your requirement',
      'Plot ' || new.plot_code || ' just listed at ₹' || to_char(new.price, 'FM99,99,99,99,999') || ' — take a look.');
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_alert_new_listing on public.properties;
create trigger trg_alert_new_listing after insert on public.properties
  for each row execute function public.alert_new_listing();

create or replace function public.alert_price_drop() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'available' and new.price < old.price then
    perform public.notify_requirement_matches(
      new.id, new.price, new.property_type_id,
      'Price drop on a matching property',
      'Plot ' || new.plot_code || ' dropped to ₹' || to_char(new.price, 'FM99,99,99,99,999') || ' (was ₹' || to_char(old.price, 'FM99,99,99,99,999') || ').');
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_alert_price_drop on public.properties;
create trigger trg_alert_price_drop after update of price on public.properties
  for each row execute function public.alert_price_drop();

-- ── 2) App Content seeds (admin-editable; app falls back to these values) ───
insert into public.app_content (key, grp, label, kind, value)
values
  ('alerts.listing_enabled', 'Alerts', 'Listing alerts (new match + price drop) — on/off', 'text', 'on'),
  ('home.show_sold',   'Home', 'Show "Recently sold" rail — on/off', 'text', 'on'),
  ('home.show_digest', 'Home', 'Show partner "Today at a glance" card — on/off', 'text', 'on'),
  ('tour.slide1_title', 'Welcome tour', 'Tour slide 1 — title', 'text', 'Find verified land & plots'),
  ('tour.slide1_body',  'Welcome tour', 'Tour slide 1 — body', 'text', 'Browse live inventory, compare, calculate EMI and book site visits — all in one app.'),
  ('tour.slide2_title', 'Welcome tour', 'Tour slide 2 — title', 'text', 'Negotiate & buy with confidence'),
  ('tour.slide2_body',  'Welcome tour', 'Tour slide 2 — body', 'text', 'Make offers, get counter-offers, track your bookings and payments transparently.'),
  ('tour.slide3_title', 'Welcome tour', 'Tour slide 3 — title', 'text', 'Earn with your network'),
  ('tour.slide3_body',  'Welcome tour', 'Tour slide 3 — body', 'text', 'Partners get a digital business card, AI marketing studio and commission tracking.')
on conflict (key) do nothing;
