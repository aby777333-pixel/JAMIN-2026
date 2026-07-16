-- JAMIN Properties — 0099 Buyer module: install-source attribution, promoter
-- contact routing, buyer activity capture (contact taps + brochure/document
-- opens), buyer read access to listing documents, live-chat feature flag.
-- FULLY ADDITIVE — no existing table, policy or function behaviour is removed;
-- complete_onboarding and guard_profile_columns are extended in place.

-- ─── 1. profiles: how the app was installed + the assigned promoter ─────────
-- install_source: 'direct' (store download) or 'referral' (came in through a
-- promoter's referral link/code). assigned_promoter_id: the promoter the buyer
-- is bound to for contact routing; persists until an ADMIN changes it.
alter table public.profiles
  add column if not exists install_source text not null default 'direct'
    check (install_source in ('direct', 'referral'));
alter table public.profiles
  add column if not exists assigned_promoter_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_profiles_assigned_promoter on public.profiles(assigned_promoter_id);

-- Guard the new columns from self-service edits (same pattern as 0014): only
-- admins or trusted server-side functions may change attribution.
create or replace function public.guard_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('jamin.trusted', true), '') = 'on' then return new; end if;
  if public.auth_is_admin() then return new; end if;
  -- non-admin self-update: keep protected columns at their previous values
  new.role_id              := old.role_id;
  new.parent_id            := old.parent_id;
  new.hierarchy_path       := old.hierarchy_path;
  new.kyc_status           := old.kyc_status;
  new.status               := old.status;
  new.referral_code        := old.referral_code;
  new.install_source       := old.install_source;
  new.assigned_promoter_id := old.assigned_promoter_id;
  return new;
end $$;

-- ─── 2. complete_onboarding: stamp attribution when a referral code binds ───
-- Same signature + same hierarchy behaviour as 0014; additionally records
-- install_source='referral' and the referrer as assigned promoter.
create or replace function public.complete_onboarding(
  p_full_name text,
  p_phone text,
  p_referral_code text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_self uuid := auth.uid();
  v_ref  public.profiles%rowtype;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  perform set_config('jamin.trusted', 'on', true);

  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select * into v_ref from public.profiles
      where referral_code = upper(trim(p_referral_code)) and id <> v_self;
    if found then
      update public.profiles
        set full_name = p_full_name, phone = p_phone,
            parent_id = v_ref.id,
            hierarchy_path = v_ref.hierarchy_path || text2ltree(public.uuid_label(v_self)),
            install_source = 'referral',
            assigned_promoter_id = v_ref.id
        where id = v_self;
      return;
    end if;
  end if;

  update public.profiles
    set full_name = p_full_name, phone = p_phone
    where id = v_self;
end $$;
revoke execute on function public.complete_onboarding(text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text) to authenticated;

-- Backfill: buyers who already bound to a referrer keep that relationship.
update public.profiles pr
   set install_source = 'referral', assigned_promoter_id = pr.parent_id
 where pr.parent_id is not null
   and pr.assigned_promoter_id is null
   and pr.role_id in (select id from public.roles where slug = 'buyer');

-- ─── 3. Promoter contact for the buyer (no profiles-RLS loosening) ──────────
-- A referred buyer may see ONLY their own assigned promoter's public contact.
create or replace function public.get_my_promoter_contact()
returns table (promoter_id uuid, full_name text, phone text, photo_url text)
language sql security definer set search_path = public stable as $$
  select p.id, p.full_name, p.phone, p.photo_url
    from public.profiles me
    join public.profiles p on p.id = me.assigned_promoter_id
   where me.id = auth.uid()
     and me.install_source = 'referral';
$$;
revoke execute on function public.get_my_promoter_contact() from public, anon;
grant execute on function public.get_my_promoter_contact() to authenticated;

-- ─── 4. contact_events: every buyer call/WhatsApp/email tap, admin-visible ──
create table if not exists public.contact_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  target      text not null check (target in ('jamin', 'promoter')),
  channel     text not null check (channel in ('call', 'whatsapp', 'email')),
  promoter_id uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_contact_events_user on public.contact_events(user_id);
alter table public.contact_events enable row level security;
drop policy if exists contact_events_insert on public.contact_events;
create policy contact_events_insert on public.contact_events for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists contact_events_read on public.contact_events;
create policy contact_events_read on public.contact_events for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
grant insert, select on public.contact_events to authenticated;

-- ─── 5. brochure_downloads: brochure/document opens, admin-visible ──────────
create table if not exists public.brochure_downloads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  doc_id      uuid references public.deal_documents(id) on delete set null,
  title       text not null default 'Brochure',
  url         text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_brochure_downloads_user on public.brochure_downloads(user_id);
alter table public.brochure_downloads enable row level security;
drop policy if exists brochure_downloads_insert on public.brochure_downloads;
create policy brochure_downloads_insert on public.brochure_downloads for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists brochure_downloads_read on public.brochure_downloads;
create policy brochure_downloads_read on public.brochure_downloads for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
grant insert, select on public.brochure_downloads to authenticated;

-- ─── 6. Buyers can read documents attached to APPROVED listings ─────────────
-- The Document Vault stays private (owner/admin, 0057). This only opens rows a
-- seller/admin deliberately attached to a listing that passed approval.
drop policy if exists deal_docs_listing_read on public.deal_documents;
create policy deal_docs_listing_read on public.deal_documents for select to authenticated
  using (
    property_id is not null
    and exists (
      select 1 from public.properties p
       where p.id = deal_documents.property_id
         and p.approval_status = 'approved'
    )
  );

-- ─── 7. Live-chat feature flag (admin → Features toggles it back on) ────────
insert into public.app_features (key, name, description, category, icon, enabled, sort_order)
values ('live_chat', 'Live Chat (Buyer Support)',
        'In-app buyer-to-support live chat. Hidden in the buyer app while disabled; flip on to bring it back — no app update needed.',
        'buyer', 'chatbubbles', false, 170)
on conflict (key) do nothing;

-- ─── 8. Realtime: admin activity radar coverage for the new tables ──────────
do $$
declare t text;
begin
  foreach t in array array['contact_events', 'brochure_downloads'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime'
                     and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
