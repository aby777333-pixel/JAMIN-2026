-- JAMIN Properties — 0037 listing approval workflow, verification badges,
-- seller-owned listings, property-view tracking, seller dashboard stats, and
-- broad activity audit logging.
--
-- ALL ADDITIVE & regression-safe:
--   • New columns default so existing admin inventory stays public (approved).
--   • A guard trigger means a non-admin can NEVER self-approve or self-verify.
--   • RLS keeps the public catalog to approved listings only; sellers see their
--     own (incl. pending); admins see everything (unchanged for admins).
--   • Audit logging is written through an exception-safe helper so it can never
--     break the underlying operation.

-- ───────────────────────── properties: new columns ─────────────────────────
alter table public.properties
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('pending','approved','rejected')),
  add column if not exists approval_note      text,
  add column if not exists reviewed_by        uuid,
  add column if not exists reviewed_at        timestamptz,
  add column if not exists seller_id          uuid references public.profiles(id) on delete set null,
  add column if not exists verified_seller    boolean not null default false,
  add column if not exists verified_documents boolean not null default false,
  add column if not exists verified_location  boolean not null default false,
  add column if not exists is_premium         boolean not null default false;

-- Existing rows are admin-curated inventory → already public/approved.
update public.properties set approval_status = 'approved' where approval_status is null;

create index if not exists idx_properties_approval on public.properties(approval_status);
create index if not exists idx_properties_seller   on public.properties(seller_id);

-- ───────── guard: non-admins can't set privileged listing columns ──────────
-- Mirrors guard_profile_columns (0014). Trusted SECURITY DEFINER paths opt out
-- via the jamin.trusted flag; admins are unrestricted.
create or replace function public.guard_property_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('jamin.trusted', true), '') = 'on' then return new; end if;
  if public.auth_is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    -- a seller may only ever create a PENDING listing owned by themselves
    new.approval_status    := 'pending';
    new.approval_note      := null;
    new.reviewed_by        := null;
    new.reviewed_at        := null;
    new.verified_seller    := false;
    new.verified_documents := false;
    new.verified_location  := false;
    new.is_premium         := false;
    new.seller_id          := auth.uid();
  else
    -- a seller editing their own listing cannot touch any privileged column
    new.approval_status    := old.approval_status;
    new.approval_note      := old.approval_note;
    new.reviewed_by        := old.reviewed_by;
    new.reviewed_at        := old.reviewed_at;
    new.verified_seller    := old.verified_seller;
    new.verified_documents := old.verified_documents;
    new.verified_location  := old.verified_location;
    new.is_premium         := old.is_premium;
    new.seller_id          := old.seller_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_property on public.properties;
create trigger trg_guard_property before insert or update on public.properties
  for each row execute function public.guard_property_columns();

-- ───────────────── RLS: public sees approved; sellers see own ───────────────
drop policy if exists properties_read on public.properties;
create policy properties_read on public.properties for select to authenticated
  using (
    coalesce(approval_status, 'approved') = 'approved'
    or public.auth_is_admin()
    or seller_id = auth.uid()
  );

-- Sellers may create/edit their OWN listings (guard forces pending + ownership).
drop policy if exists properties_seller_insert on public.properties;
create policy properties_seller_insert on public.properties for insert to authenticated
  with check (seller_id = auth.uid());
drop policy if exists properties_seller_update on public.properties;
create policy properties_seller_update on public.properties for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());
-- (properties_admin "for all" is unchanged — admins keep full control.)

-- ───────────────────────── property view tracking ──────────────────────────
create table if not exists public.property_views (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  viewer_id   uuid references public.profiles(id) on delete set null,
  viewed_on   date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (property_id, viewer_id, viewed_on)
);
create index if not exists idx_property_views_prop on public.property_views(property_id);

alter table public.property_views enable row level security;
drop policy if exists property_views_read on public.property_views;
create policy property_views_read on public.property_views for select to authenticated
  using (
    public.auth_is_admin()
    or viewer_id = auth.uid()
    or exists (select 1 from public.properties p
               where p.id = property_views.property_id and p.seller_id = auth.uid())
  );

-- One de-duplicated view per viewer per property per day; never blocks the app.
create or replace function public.log_property_view(p_property uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid();
begin
  if v_self is null or p_property is null then return; end if;
  insert into public.property_views(property_id, viewer_id, viewed_on)
  values (p_property, v_self, current_date)
  on conflict (property_id, viewer_id, viewed_on) do nothing;
exception when others then
  return;
end $$;
revoke execute on function public.log_property_view(uuid) from public, anon;
grant  execute on function public.log_property_view(uuid) to authenticated;

-- ─────────────────────── audit: exception-safe logger ──────────────────────
-- audit_logs is append-only (0005/0012). This helper swallows any error so an
-- audit write can never roll back the operation that triggered it.
create or replace function public.app_audit(
  p_action text, p_entity text, p_entity_id uuid, p_payload jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_payload, '{}'::jsonb));
exception when others then
  return;
end $$;

-- Admin-callable audit (used by the web console for explicit actions/exports).
create or replace function public.log_admin_action(
  p_action text, p_entity text default null,
  p_entity_id uuid default null, p_payload jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_is_admin() then return; end if;
  perform public.app_audit(p_action, p_entity, p_entity_id, p_payload);
end $$;
revoke execute on function public.log_admin_action(text,text,uuid,jsonb) from public, anon;
grant  execute on function public.log_admin_action(text,text,uuid,jsonb) to authenticated;

-- ───────────────────────── audit triggers (additive) ───────────────────────
create or replace function public.trg_audit_properties()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.app_audit('property.created', 'property', new.id,
      jsonb_build_object('plot_code', new.plot_code,
                         'approval_status', new.approval_status,
                         'seller_id', new.seller_id));
  elsif tg_op = 'UPDATE' then
    if new.approval_status is distinct from old.approval_status then
      perform public.app_audit('property.' || new.approval_status, 'property', new.id,
        jsonb_build_object('note', new.approval_note));
    end if;
    if new.status is distinct from old.status then
      perform public.app_audit('property.status.' || new.status, 'property', new.id, '{}'::jsonb);
    end if;
    if (new.verified_seller, new.verified_documents, new.verified_location, new.is_premium)
       is distinct from
       (old.verified_seller, old.verified_documents, old.verified_location, old.is_premium) then
      perform public.app_audit('property.verification', 'property', new.id,
        jsonb_build_object('seller', new.verified_seller, 'documents', new.verified_documents,
                           'location', new.verified_location, 'premium', new.is_premium));
    end if;
  end if;
  return null;
end $$;
drop trigger if exists trg_audit_properties on public.properties;
create trigger trg_audit_properties after insert or update on public.properties
  for each row execute function public.trg_audit_properties();

create or replace function public.trg_audit_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kyc_status is distinct from old.kyc_status then
    perform public.app_audit('kyc.' || new.kyc_status, 'profile', new.id, '{}'::jsonb);
  end if;
  if new.role_id is distinct from old.role_id then
    perform public.app_audit('role.changed', 'profile', new.id,
      jsonb_build_object('role_id', new.role_id));
  end if;
  return null;
end $$;
drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles after update on public.profiles
  for each row execute function public.trg_audit_profiles();

create or replace function public.trg_audit_bookings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.app_audit('booking.' || coalesce(new.status, 'created'), 'booking', new.id,
      jsonb_build_object('property_id', new.property_id));
  elsif new.status is distinct from old.status then
    perform public.app_audit('booking.' || new.status, 'booking', new.id, '{}'::jsonb);
  end if;
  return null;
end $$;
drop trigger if exists trg_audit_bookings on public.bookings;
create trigger trg_audit_bookings after insert or update on public.bookings
  for each row execute function public.trg_audit_bookings();

create or replace function public.trg_audit_withdrawals()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.app_audit('withdrawal.requested', 'withdrawal', new.id,
      jsonb_build_object('amount', new.amount));
  elsif new.status is distinct from old.status then
    perform public.app_audit('withdrawal.' || new.status, 'withdrawal', new.id,
      jsonb_build_object('amount', new.amount));
  end if;
  return null;
end $$;
drop trigger if exists trg_audit_withdrawals on public.withdrawals;
create trigger trg_audit_withdrawals after insert or update on public.withdrawals
  for each row execute function public.trg_audit_withdrawals();

create or replace function public.trg_audit_payments()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.app_audit('payment.' || coalesce(new.status, 'created'), 'payment', new.id,
      jsonb_build_object('amount', new.amount));
  elsif new.status is distinct from old.status then
    perform public.app_audit('payment.' || new.status, 'payment', new.id,
      jsonb_build_object('amount', new.amount));
  end if;
  return null;
end $$;
drop trigger if exists trg_audit_payments on public.payments;
create trigger trg_audit_payments after insert or update on public.payments
  for each row execute function public.trg_audit_payments();

-- ───────────────────── seller dashboard: per-listing stats ──────────────────
-- Counts only (no buyer contact) — honours the platform-mediated contact rule.
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
  bookings        bigint
) language sql security definer set search_path = public as $$
  select
    p.id, p.plot_code, p.status, p.approval_status, p.price,
    (select count(*) from public.property_views v where v.property_id = p.id),
    (select count(*) from public.leads        l where l.property_id = p.id),
    (select count(*) from public.wishlists    w where w.property_id = p.id),
    (select count(*) from public.bookings     b where b.property_id = p.id)
  from public.properties p
  where p.seller_id = auth.uid()
  order by p.created_at desc;
$$;
revoke execute on function public.seller_listing_stats() from public, anon;
grant  execute on function public.seller_listing_stats() to authenticated;

-- ───────────────────────────────── grants ──────────────────────────────────
grant select on public.property_views to authenticated;
