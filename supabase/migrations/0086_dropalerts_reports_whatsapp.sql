-- JAMIN Properties — 0086 price-drop alerts for saved properties, seller weekly
-- report cards, and the outbound-WhatsApp framework. All ADDITIVE: new trigger,
-- new functions, new table, new config keys — no existing object is altered.

-- ── 1) Price-drop alerts for SAVED properties ────────────────────────────────
-- Watchers (property_watches) already get price/status alerts; buyers who only
-- SAVED the property (wishlists) got nothing. Notify them on real price drops,
-- skipping anyone already covered by the watcher trigger (no double pings).
create or replace function public.notify_wishlist_price_drop() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.approval_status = 'approved' and new.status = 'available'
     and new.price is not null and old.price is not null and new.price < old.price then
    begin
      insert into public.notifications (user_id, type, title, body, data)
      select w.user_id, 'price_drop', 'Price drop on a property you saved 🎉',
             'Now ₹' || trim(to_char(new.price, 'FM999999999990')) ||
             ' (was ₹' || trim(to_char(old.price, 'FM999999999990')) || ') — a great moment to act.',
             jsonb_build_object('property_id', new.id, 'price', new.price, 'old_price', old.price)
      from public.wishlists w
      where w.property_id = new.id
        and not exists (select 1 from public.property_watches pw
                         where pw.property_id = new.id and pw.user_id = w.user_id);
    exception when others then
      null; -- alerts must never block a price edit
    end;
  end if;
  return null;
end $$;
drop trigger if exists trg_notify_wishlist_price_drop on public.properties;
create trigger trg_notify_wishlist_price_drop
  after update of price on public.properties
  for each row execute function public.notify_wishlist_price_drop();

-- ── 2) Seller weekly report cards ────────────────────────────────────────────
-- Every seller with live listings gets "your listings this week: X views ·
-- Y enquiries · Z visits" as an in-app notification. Runs Mondays 09:00 IST
-- via pg_cron; admins can fire it on demand from the CRM tab.
create or replace function public.run_seller_report_cards() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_n integer := 0;
  r record;
begin
  -- cron runs with no auth context; humans must be admins.
  if auth.uid() is not null and not public.auth_is_admin() then
    raise exception 'admin only';
  end if;

  for r in
    select pr.seller_id,
           count(distinct pr.id) as listings,
           count(distinct pv.id) as views,
           count(distinct ld.id) as enquiries,
           count(distinct sv.id) as visits
    from public.properties pr
    left join public.property_views pv
      on pv.property_id = pr.id and pv.created_at > now() - interval '7 days'
    left join public.leads ld
      on ld.property_id = pr.id and ld.created_at > now() - interval '7 days'
    left join public.site_visits sv
      on sv.property_id = pr.id and sv.created_at > now() - interval '7 days'
    where pr.seller_id is not null and pr.approval_status = 'approved'
    group by pr.seller_id
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (r.seller_id, 'seller_report', 'Your listings this week 📊',
            r.views || ' views · ' || r.enquiries || ' enquiries · ' || r.visits ||
            ' site visits across ' || r.listings || ' listing' || case when r.listings = 1 then '' else 's' end ||
            '. JAMIN is working for you — keep your listings fresh!',
            jsonb_build_object('views', r.views, 'enquiries', r.enquiries,
                               'visits', r.visits, 'listings', r.listings));
    v_n := v_n + 1;
  end loop;

  perform public.app_audit('seller.report_cards', 'profiles', null,
                           jsonb_build_object('sellers_notified', v_n));
  return v_n;
end $$;
revoke execute on function public.run_seller_report_cards() from public, anon;
grant execute on function public.run_seller_report_cards() to authenticated;

do $$
begin
  begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
      if not exists (select 1 from cron.job where jobname = 'jamin-seller-reports') then
        perform cron.schedule('jamin-seller-reports', '30 3 * * 1', 'select public.run_seller_report_cards()'); -- Mon 09:00 IST
      end if;
    end if;
  exception when others then raise notice 'cron scheduling skipped: %', sqlerrm; end;
end $$;

-- ── 3) Outbound WhatsApp framework ───────────────────────────────────────────
-- wa-send Edge Function (deployed separately) sends via the Meta Cloud API using
-- app_secrets 'wa_token' + 'wa_phone_id' (inert until both exist — same pattern
-- as the AI keys). Every send is logged here for the admin WhatsApp tab.
create table if not exists public.wa_outbox (
  id uuid primary key default gen_random_uuid(),
  to_phone text not null,
  body text not null,
  kind text not null default 'manual',   -- manual | lead_alert | test
  status text not null default 'queued', -- sent | failed | skipped
  error text,
  created_at timestamptz not null default now()
);
alter table public.wa_outbox enable row level security;
create policy wa_outbox_admin on public.wa_outbox
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
grant select on public.wa_outbox to authenticated;

insert into public.app_secrets (key, value)
values ('wa_webhook_secret', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

insert into public.system_config (key, value)
values ('wa_alerts', jsonb_build_object('enabled', false, 'numbers', jsonb_build_array()))
on conflict (key) do nothing;

-- New lead → WhatsApp ping to the configured numbers (fire-and-forget; only
-- when alerts are enabled, so the default state adds zero overhead).
create or replace function public.wa_lead_alert_ping() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb;
  v_secret text;
begin
  select value into v_cfg from public.system_config where key = 'wa_alerts';
  if v_cfg is null or coalesce((v_cfg->>'enabled')::boolean, false) = false
     or jsonb_array_length(coalesce(v_cfg->'numbers', '[]'::jsonb)) = 0 then
    return new;
  end if;
  select value into v_secret from public.app_secrets where key = 'wa_webhook_secret';
  if v_secret is null then return new; end if;
  begin
    perform net.http_post(
      url := 'https://oaqwnjgaypmuafvnfhxv.supabase.co/functions/v1/wa-send',
      body := jsonb_build_object('secret', v_secret, 'action', 'lead_alert', 'lead_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 30000
    );
  exception when others then
    null; -- never block lead capture
  end;
  return new;
end $$;
drop trigger if exists trg_wa_lead_alert on public.leads;
create trigger trg_wa_lead_alert
  after insert on public.leads
  for each row execute function public.wa_lead_alert_ping();
