-- JAMIN Properties — 0102 Promoter module (India): monthly targets, promoter
-- dashboard + clients RPCs, team invitation lifecycle, typed follow-ups,
-- site-visit feedback/photos, login/device audit, GPS-tagged media
-- submissions, promoter read access to their clients' contact taps, admin
-- re-parenting + promoter overview. FULLY ADDITIVE.

-- ─── 1. Monthly targets (admin-set; drives achievement % on the dashboard) ──
create table if not exists public.partner_targets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  month         date not null,                 -- first day of the month
  target_amount numeric(18,2) not null default 0,
  target_sales  int not null default 0,
  set_by        uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (user_id, month)
);
alter table public.partner_targets enable row level security;
drop policy if exists partner_targets_self_read on public.partner_targets;
create policy partner_targets_self_read on public.partner_targets for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
drop policy if exists partner_targets_admin on public.partner_targets;
create policy partner_targets_admin on public.partner_targets for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
grant select, insert, update, delete on public.partner_targets to authenticated;

-- ─── 2. Team invitation lifecycle (manual invites + auto-accept on signup) ──
create table if not exists public.team_invites (
  id           uuid primary key default gen_random_uuid(),
  inviter_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name         text,
  contact      text not null,                  -- phone or email
  channel      text not null default 'whatsapp',
  invited_role text not null default 'agent',  -- agent | sub_promoter | broker …
  status       text not null default 'sent' check (status in ('sent', 'accepted', 'cancelled')),
  accepted_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);
create index if not exists idx_team_invites_inviter on public.team_invites(inviter_id);
alter table public.team_invites enable row level security;
drop policy if exists team_invites_self on public.team_invites;
create policy team_invites_self on public.team_invites for all to authenticated
  using (inviter_id = auth.uid() or public.auth_is_admin())
  with check (inviter_id = auth.uid() or public.auth_is_admin());
grant select, insert, update, delete on public.team_invites to authenticated;

-- Auto-accept: when a recruit finishes onboarding under a referrer, close any
-- matching open invite (same inviter + same phone). Extends 0099's body.
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
      -- Close a matching manual invite (phone digits compared loosely).
      begin
        update public.team_invites
           set status = 'accepted', accepted_by = v_self, accepted_at = now()
         where inviter_id = v_ref.id and status = 'sent'
           and regexp_replace(contact, '\D', '', 'g') <> ''
           and regexp_replace(contact, '\D', '', 'g')
               = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), length(regexp_replace(contact, '\D', '', 'g')));
      exception when others then null;
      end;
      return;
    end if;
  end if;

  update public.profiles
    set full_name = p_full_name, phone = p_phone
    where id = v_self;
end $$;
revoke execute on function public.complete_onboarding(text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text) to authenticated;

-- ─── 3. Typed follow-ups + visit feedback/photos ─────────────────────────────
alter table public.follow_ups
  add column if not exists kind text not null default 'call'
    check (kind in ('call', 'meeting', 'site_visit', 'documentation', 'booking'));
alter table public.site_visits
  add column if not exists feedback text,
  add column if not exists visit_photos jsonb not null default '[]'::jsonb;

-- Agent (or the buyer) records post-visit feedback + photos through a scoped RPC
-- so site_visits keeps its writes-via-RPC-only posture.
create or replace function public.record_visit_feedback(
  p_visit uuid, p_feedback text default null, p_photos jsonb default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v public.site_visits%rowtype;
begin
  select * into v from public.site_visits where id = p_visit;
  if not found then raise exception 'visit not found'; end if;
  if auth.uid() is null or (auth.uid() <> v.agent_id and auth.uid() <> v.buyer_id and not public.auth_is_admin()) then
    raise exception 'not authorized';
  end if;
  update public.site_visits
     set feedback = coalesce(p_feedback, feedback),
         visit_photos = case when p_photos is not null and jsonb_typeof(p_photos) = 'array'
                             then visit_photos || p_photos else visit_photos end,
         updated_at = now()
   where id = p_visit;
end $$;
revoke execute on function public.record_visit_feedback(uuid, text, jsonb) from public, anon;
grant execute on function public.record_visit_feedback(uuid, text, jsonb) to authenticated;

-- ─── 4. Login / device audit ─────────────────────────────────────────────────
create table if not exists public.login_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  platform    text,
  os_version  text,
  model       text,
  app_version text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_login_events_user on public.login_events(user_id);
alter table public.login_events enable row level security;
drop policy if exists login_events_insert on public.login_events;
create policy login_events_insert on public.login_events for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists login_events_read on public.login_events;
create policy login_events_read on public.login_events for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
grant insert, select on public.login_events to authenticated;

-- ─── 5. GPS-tagged media submissions ─────────────────────────────────────────
alter table public.property_media_submissions
  add column if not exists lat numeric,
  add column if not exists lng numeric,
  add column if not exists captured_at timestamptz;

-- ─── 6. Promoters see contact taps routed to THEM ────────────────────────────
drop policy if exists contact_events_read on public.contact_events;
create policy contact_events_read on public.contact_events for select to authenticated
  using (user_id = auth.uid() or promoter_id = auth.uid() or public.auth_is_admin());

-- ─── 7. Promoter dashboard rollup (single definer RPC, self-scoped) ─────────
create or replace function public.promoter_dashboard()
returns table (
  total_buyers int, total_sellers int, active_listings int,
  new_leads int, pending_followups int, upcoming_visits int,
  sales_closed int, commission_earned numeric, commission_pending numeric,
  wallet_balance numeric, month_earned numeric,
  target_amount numeric, target_sales int, achievement_pct numeric
)
language plpgsql security definer set search_path = public stable as $$
declare
  me uuid := auth.uid();
  m0 date := date_trunc('month', now())::date;
begin
  if me is null then raise exception 'not authenticated'; end if;
  return query
  select
    (select count(*)::int from public.profiles pr join public.roles r on r.id = pr.role_id
      where pr.assigned_promoter_id = me and r.slug = 'buyer'),
    (select count(*)::int from public.profiles pr join public.roles r on r.id = pr.role_id
      where pr.assigned_promoter_id = me and r.slug in ('seller', 'builder', 'developer')),
    (select count(*)::int from public.properties p
      where p.approval_status = 'approved' and coalesce(p.is_hidden, false) = false
        and p.archived_at is null and p.status = 'available'
        and p.seller_id in (select pr.id from public.profiles pr where pr.assigned_promoter_id = me)),
    (select count(*)::int from public.leads l where l.owner_id = me and l.status = 'new'),
    (select count(*)::int from public.follow_ups f join public.leads l on l.id = f.lead_id
      where l.owner_id = me and f.status = 'pending'),
    (select count(*)::int from public.site_visits sv
      where sv.agent_id = me and sv.scheduled_at >= now() and sv.status in ('requested', 'confirmed')),
    (select count(*)::int from public.commission_ledger cl
      where cl.user_id = me and cl.direction = 'credit' and cl.source_ref like 'sale:%'),
    coalesce((select sum(cl.amount) from public.commission_ledger cl
      where cl.user_id = me and cl.direction = 'credit'), 0),
    coalesce((select sum(cl.amount) from public.commission_ledger cl
      where cl.user_id = me and cl.direction = 'credit' and cl.status <> 'posted'), 0),
    coalesce((select w.balance from public.wallets w where w.user_id = me), 0),
    coalesce((select sum(cl.amount) from public.commission_ledger cl
      where cl.user_id = me and cl.direction = 'credit' and cl.created_at >= m0), 0),
    coalesce((select t.target_amount from public.partner_targets t where t.user_id = me and t.month = m0), 0),
    coalesce((select t.target_sales from public.partner_targets t where t.user_id = me and t.month = m0), 0),
    case
      when coalesce((select t.target_amount from public.partner_targets t where t.user_id = me and t.month = m0), 0) > 0
      then round(100 * coalesce((select sum(cl.amount) from public.commission_ledger cl
             where cl.user_id = me and cl.direction = 'credit' and cl.created_at >= m0), 0)
           / (select t.target_amount from public.partner_targets t where t.user_id = me and t.month = m0), 1)
      else null
    end;
end $$;
revoke execute on function public.promoter_dashboard() from public, anon;
grant execute on function public.promoter_dashboard() to authenticated;

-- ─── 8. Promoter clients list (assigned buyers/sellers, self-scoped) ────────
create or replace function public.promoter_clients(p_kind text default 'buyer')
returns table (
  client_id uuid, full_name text, phone text, role_slug text,
  kyc_status text, install_source text, joined_at timestamptz,
  open_leads int, upcoming_visits int
)
language sql security definer set search_path = public stable as $$
  select pr.id, pr.full_name, pr.phone, r.slug, pr.kyc_status::text, pr.install_source, pr.created_at,
    (select count(*)::int from public.leads l
      where l.user_id = pr.id and l.status not in ('won', 'lost')),
    (select count(*)::int from public.site_visits sv
      where sv.buyer_id = pr.id and sv.scheduled_at >= now() and sv.status in ('requested', 'confirmed'))
  from public.profiles pr
  join public.roles r on r.id = pr.role_id
  where pr.assigned_promoter_id = auth.uid()
    and case when p_kind = 'seller' then r.slug in ('seller', 'builder', 'developer')
             else r.slug = 'buyer' end
  order by pr.created_at desc;
$$;
revoke execute on function public.promoter_clients(text) from public, anon;
grant execute on function public.promoter_clients(text) to authenticated;

-- ─── 9. Admin: re-parent a member (moves their whole subtree) ────────────────
create or replace function public.admin_set_parent(p_user uuid, p_new_parent uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  old_path ltree; new_parent_path ltree; new_path ltree;
begin
  if not public.auth_is_admin() then raise exception 'admin only'; end if;
  if p_user = p_new_parent then raise exception 'cannot parent to self'; end if;
  select hierarchy_path into old_path from public.profiles where id = p_user;
  select hierarchy_path into new_parent_path from public.profiles where id = p_new_parent;
  if old_path is null or new_parent_path is null then raise exception 'user or parent not found'; end if;
  if new_parent_path <@ old_path then raise exception 'cannot move under own subtree'; end if;
  new_path := new_parent_path || text2ltree(public.uuid_label(p_user));
  perform set_config('jamin.trusted', 'on', true);
  update public.profiles set parent_id = p_new_parent, hierarchy_path = new_path where id = p_user;
  -- Carry every descendant along.
  update public.profiles
     set hierarchy_path = new_path || subpath(hierarchy_path, nlevel(old_path))
   where hierarchy_path <@ old_path and id <> p_user;
  insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'hierarchy.reparent', 'profile', p_user,
          jsonb_build_object('new_parent', p_new_parent));
exception when undefined_table then null;
end $$;
revoke execute on function public.admin_set_parent(uuid, uuid) from public, anon;
grant execute on function public.admin_set_parent(uuid, uuid) to authenticated;

-- ─── 10. Admin: per-promoter overview rollup ─────────────────────────────────
create or replace function public.admin_promoter_overview()
returns table (
  user_id uuid, full_name text, role_slug text, status text,
  direct_recruits int, team_size int, assigned_buyers int, assigned_sellers int,
  month_credits numeric, total_credits numeric
)
language sql security definer set search_path = public stable as $$
  select pr.id, pr.full_name, r.slug, pr.status,
    (select count(*)::int from public.profiles c where c.parent_id = pr.id),
    (select count(*)::int - 1 from public.profiles c where c.hierarchy_path <@ pr.hierarchy_path),
    (select count(*)::int from public.profiles c join public.roles cr on cr.id = c.role_id
      where c.assigned_promoter_id = pr.id and cr.slug = 'buyer'),
    (select count(*)::int from public.profiles c join public.roles cr on cr.id = c.role_id
      where c.assigned_promoter_id = pr.id and cr.slug in ('seller', 'builder', 'developer')),
    coalesce((select sum(cl.amount) from public.commission_ledger cl
      where cl.user_id = pr.id and cl.direction = 'credit'
        and cl.created_at >= date_trunc('month', now())), 0),
    coalesce((select sum(cl.amount) from public.commission_ledger cl
      where cl.user_id = pr.id and cl.direction = 'credit'), 0)
  from public.profiles pr
  join public.roles r on r.id = pr.role_id
  where r.slug in ('promoter', 'sub_promoter') and public.auth_is_admin()
  order by pr.created_at desc;
$$;
revoke execute on function public.admin_promoter_overview() from public, anon;
grant execute on function public.admin_promoter_overview() to authenticated;

-- ─── 11. Realtime + feature registry ─────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['team_invites', 'login_events'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime'
                     and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('promoter_dashboard', 'Promoter Dashboard', 'Real-time buyers/sellers/listings/leads/visits/commission/target achievement in one view.', 'partner', 'speedometer', 184),
  ('promoter_clients',   'My Clients',          'Every buyer and seller assigned to a promoter, with lead and visit context.', 'partner', 'people-circle', 186),
  ('team_invites',       'Team Invitations',    'Manual + link invites with sent/accepted lifecycle tracking; auto-matched at signup.', 'partner', 'person-add', 188),
  ('monthly_targets',    'Monthly Targets',     'Admin-set commission/sales targets per partner with live achievement %.', 'admin', 'flag', 190)
on conflict (key) do nothing;
