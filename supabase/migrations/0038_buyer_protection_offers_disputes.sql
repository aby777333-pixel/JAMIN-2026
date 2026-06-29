-- JAMIN Properties — 0038 buyer protection & communication.
-- Offers/negotiation, disputes, message moderation, call logs, and a public
-- settings flag so seller contact can be hidden on web ads (contact stays
-- platform-mediated — never auto-revealed). All additive & regression-safe.

-- ───────────────── message moderation: hide flag (additive) ────────────────
alter table public.messages    add column if not exists hidden boolean not null default false;
alter table public.ad_messages add column if not exists hidden boolean not null default false;

-- Admins may moderate (hide/unhide) messages.
drop policy if exists messages_admin_update on public.messages;
create policy messages_admin_update on public.messages for update to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
drop policy if exists ad_messages_admin_update on public.ad_messages;
create policy ad_messages_admin_update on public.ad_messages for update to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- ───────────────────── public settings (anon-readable) ─────────────────────
insert into public.system_config(key, value)
values ('ad_contact_visibility', '"hidden"'::jsonb)
on conflict (key) do nothing;

-- Anon ad pages can't read system_config (authenticated-only); expose a tiny
-- whitelist of public flags through a SECURITY DEFINER function instead.
create or replace function public.get_public_settings()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'ad_contact_visibility',
    coalesce((select value from public.system_config where key = 'ad_contact_visibility'), '"hidden"'::jsonb)
  );
$$;
grant execute on function public.get_public_settings() to anon, authenticated;

-- ─────────────────────────── offers / negotiation ──────────────────────────
create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id) on delete cascade,
  buyer_id        uuid not null references public.profiles(id) on delete cascade,
  amount          numeric(18,2) not null,
  message         text,
  status          text not null default 'pending'
                    check (status in ('pending','countered','accepted','declined','withdrawn')),
  counter_amount  numeric(18,2),
  counter_message text,
  responded_by    uuid,
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_offers_property on public.offers(property_id);
create index if not exists idx_offers_buyer    on public.offers(buyer_id);
create trigger trg_offers_updated before update on public.offers
  for each row execute function public.set_updated_at();

alter table public.offers enable row level security;
-- Read: the buyer, the property's seller, or an admin. Writes go through RPCs only.
drop policy if exists offers_select on public.offers;
create policy offers_select on public.offers for select to authenticated
  using (
    buyer_id = auth.uid()
    or public.auth_is_admin()
    or exists (select 1 from public.properties p
               where p.id = offers.property_id and p.seller_id = auth.uid())
  );

-- Buyer makes an offer → notify the seller (if the listing has one).
create or replace function public.make_offer(p_property uuid, p_amount numeric, p_message text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_id uuid; v_seller uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  insert into public.offers(property_id, buyer_id, amount, message)
  values (p_property, v_self, p_amount, p_message) returning id into v_id;
  select seller_id into v_seller from public.properties where id = p_property;
  if v_seller is not null and v_seller <> v_self then
    insert into public.notifications(user_id, type, title, body, data)
    values (v_seller, 'offer', 'New offer received',
            'You received an offer on your listing.',
            jsonb_build_object('offer_id', v_id, 'property_id', p_property, 'amount', p_amount));
  end if;
  perform public.app_audit('offer.created', 'offer', v_id, jsonb_build_object('property_id', p_property, 'amount', p_amount));
  return v_id;
end $$;
revoke execute on function public.make_offer(uuid, numeric, text) from public, anon;
grant  execute on function public.make_offer(uuid, numeric, text) to authenticated;

-- Seller/admin responds (accept / decline / counter) → notify the buyer.
create or replace function public.respond_offer(
  p_offer uuid, p_decision text, p_counter_amount numeric default null, p_counter_message text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_buyer uuid; v_prop uuid; v_seller uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  if p_decision not in ('accepted','declined','countered') then raise exception 'bad decision'; end if;
  select buyer_id, property_id into v_buyer, v_prop from public.offers where id = p_offer;
  if v_buyer is null then raise exception 'offer not found'; end if;
  select seller_id into v_seller from public.properties where id = v_prop;
  if not (public.auth_is_admin() or v_seller = v_self) then raise exception 'not authorized'; end if;

  update public.offers
    set status = p_decision,
        counter_amount = case when p_decision = 'countered' then p_counter_amount else counter_amount end,
        counter_message = case when p_decision = 'countered' then p_counter_message else counter_message end,
        responded_by = v_self, responded_at = now()
    where id = p_offer;

  insert into public.notifications(user_id, type, title, body, data)
  values (v_buyer, 'offer',
          case p_decision when 'accepted' then 'Offer accepted'
                          when 'declined' then 'Offer declined'
                          else 'Counter-offer received' end,
          case p_decision when 'countered' then 'The seller sent a counter-offer.'
                          else 'Your offer was ' || p_decision || '.' end,
          jsonb_build_object('offer_id', p_offer, 'property_id', v_prop, 'decision', p_decision));
  perform public.app_audit('offer.' || p_decision, 'offer', p_offer, '{}'::jsonb);
end $$;
revoke execute on function public.respond_offer(uuid, text, numeric, text) from public, anon;
grant  execute on function public.respond_offer(uuid, text, numeric, text) to authenticated;

-- Buyer withdraws their own offer.
create or replace function public.withdraw_offer(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid();
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  update public.offers set status = 'withdrawn'
    where id = p_offer and buyer_id = v_self and status in ('pending','countered');
  perform public.app_audit('offer.withdrawn', 'offer', p_offer, '{}'::jsonb);
end $$;
revoke execute on function public.withdraw_offer(uuid) from public, anon;
grant  execute on function public.withdraw_offer(uuid) to authenticated;

-- ──────────────────────────── disputes / reports ───────────────────────────
create table if not exists public.disputes (
  id          uuid primary key default gen_random_uuid(),
  raised_by   uuid not null references public.profiles(id) on delete cascade,
  subject     text not null,
  details     text,
  property_id uuid references public.properties(id) on delete set null,
  status      text not null default 'open' check (status in ('open','reviewing','resolved','rejected')),
  resolution  text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_disputes_status on public.disputes(status);

alter table public.disputes enable row level security;
drop policy if exists disputes_select on public.disputes;
create policy disputes_select on public.disputes for select to authenticated
  using (raised_by = auth.uid() or public.auth_is_admin());
drop policy if exists disputes_insert on public.disputes;
create policy disputes_insert on public.disputes for insert to authenticated
  with check (raised_by = auth.uid());
drop policy if exists disputes_admin on public.disputes;
create policy disputes_admin on public.disputes for update to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

create or replace function public.trg_audit_disputes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.app_audit('dispute.opened', 'dispute', new.id, jsonb_build_object('subject', new.subject));
  elsif new.status is distinct from old.status then
    perform public.app_audit('dispute.' || new.status, 'dispute', new.id, '{}'::jsonb);
  end if;
  return null;
end $$;
drop trigger if exists trg_audit_disputes on public.disputes;
create trigger trg_audit_disputes after insert or update on public.disputes
  for each row execute function public.trg_audit_disputes();

-- ─────────────────────────────── call logs ─────────────────────────────────
create table if not exists public.call_logs (
  id          uuid primary key default gen_random_uuid(),
  slug        text,
  property_id uuid references public.properties(id) on delete set null,
  initiator   text,
  kind        text check (kind in ('voice','video')),
  room        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_call_logs_slug on public.call_logs(slug);
alter table public.call_logs enable row level security;
-- Anonymous ad pages may record a call event; only admins can read them.
drop policy if exists call_logs_insert on public.call_logs;
create policy call_logs_insert on public.call_logs for insert to anon, authenticated
  with check (true);
drop policy if exists call_logs_admin_read on public.call_logs;
create policy call_logs_admin_read on public.call_logs for select to authenticated
  using (public.auth_is_admin());
grant insert on public.call_logs to anon, authenticated;
grant select on public.call_logs to authenticated;

-- ───────────── seller dashboard stats: add live offers count ────────────────
drop function if exists public.seller_listing_stats();
create or replace function public.seller_listing_stats()
returns table (
  property_id     uuid,
  plot_code       text,
  status          text,
  approval_status text,
  price           numeric,
  views           bigint,
  enquiries       bigint,
  saves           bigint,
  bookings        bigint,
  offers          bigint
) language sql security definer set search_path = public as $$
  select
    p.id, p.plot_code, p.status, p.approval_status, p.price,
    (select count(*) from public.property_views v where v.property_id = p.id),
    (select count(*) from public.leads        l where l.property_id = p.id),
    (select count(*) from public.wishlists    w where w.property_id = p.id),
    (select count(*) from public.bookings     b where b.property_id = p.id),
    (select count(*) from public.offers       o where o.property_id = p.id)
  from public.properties p
  where p.seller_id = auth.uid()
  order by p.created_at desc;
$$;
revoke execute on function public.seller_listing_stats() from public, anon;
grant  execute on function public.seller_listing_stats() to authenticated;

grant select on public.offers   to authenticated;
grant select on public.disputes to authenticated;
