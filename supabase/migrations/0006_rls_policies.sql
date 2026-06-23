-- JAMIN Properties — 0006 RLS. Default deny everywhere; scope by auth.uid(), by
-- role (auth_is_admin), and by subtree (hierarchy_path <@ auth_hierarchy_path()).
-- See docs/RLS.md for the full policy matrix.

-- Trigger writers must bypass RLS -> SECURITY DEFINER (recreate as definer).
create or replace function public.next_plot_code(p_type uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_prefix text; v_n int;
begin
  select code_prefix into v_prefix from public.property_types where id = p_type;
  if v_prefix is null then raise exception 'unknown property_type %', p_type; end if;
  insert into public.plot_counters(prefix, next) values (v_prefix, 1)
    on conflict (prefix) do update set next = public.plot_counters.next + 1
    returning next into v_n;
  return v_prefix || '-' || lpad(v_n::text, 4, '0');
end $$;

create or replace function public.log_property_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory_events(property_id, type, payload)
  values (new.id, 'created', jsonb_build_object('plot_code', new.plot_code));
  return new;
end $$;

-- Enable RLS on every table (default deny).
do $$
declare t text;
begin
  foreach t in array array[
    'roles','territories','projects','plans','property_types','commission_rules',
    'form_definitions','gamification_rules','referral_rules','system_config',
    'profiles','properties','inventory_events','plot_counters','commission_ledger',
    'wallets','withdrawals','referral_events','leads','follow_ups','bookings',
    'payments','card_templates','business_cards','card_shares','card_scans',
    'notifications','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- ── Dynamic config: readable by any signed-in user, writable by admins only ──
do $$
declare t text;
begin
  foreach t in array array[
    'roles','territories','projects','plans','property_types','commission_rules',
    'form_definitions','gamification_rules','referral_rules','system_config','card_templates'
  ] loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (true);', t);
    execute format('create policy %1$s_admin on public.%1$s for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());', t);
  end loop;
end $$;

-- ── profiles ──
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.auth_is_admin() or hierarchy_path <@ public.auth_hierarchy_path());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin on public.profiles for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- ── properties + inventory_events ──
create policy properties_read on public.properties for select to authenticated using (true);
create policy properties_admin on public.properties for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy inv_events_select on public.inventory_events for select to authenticated
  using (public.auth_is_admin() or actor_id = auth.uid());

-- ── money: read own or admin; writes go through definer triggers / service role ──
create policy ledger_select on public.commission_ledger for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
create policy wallets_select on public.wallets for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());

create policy withdrawals_select on public.withdrawals for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
create policy withdrawals_request on public.withdrawals for insert to authenticated
  with check (user_id = auth.uid());
create policy withdrawals_admin on public.withdrawals for update to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- ── referral events: sharer logs & reads own; admin all ──
create policy referral_select on public.referral_events for select to authenticated
  using (sharer_id = auth.uid() or public.auth_is_admin());
create policy referral_insert on public.referral_events for insert to authenticated
  with check (sharer_id = auth.uid());

-- ── CRM: owner + subtree manager + admin ──
create policy leads_owner on public.leads for all to authenticated
  using (
    owner_id = auth.uid() or public.auth_is_admin() or
    exists (select 1 from public.profiles p where p.id = leads.owner_id
            and p.hierarchy_path <@ public.auth_hierarchy_path())
  )
  with check (owner_id = auth.uid() or public.auth_is_admin());
create policy followups_via_lead on public.follow_ups for all to authenticated
  using (exists (select 1 from public.leads l where l.id = follow_ups.lead_id
                 and (l.owner_id = auth.uid() or public.auth_is_admin())))
  with check (exists (select 1 from public.leads l where l.id = follow_ups.lead_id
                 and (l.owner_id = auth.uid() or public.auth_is_admin())));

-- ── bookings + payments ──
create policy bookings_participants on public.bookings for select to authenticated
  using (buyer_id = auth.uid() or agent_id = auth.uid() or public.auth_is_admin());
create policy bookings_create on public.bookings for insert to authenticated
  with check (buyer_id = auth.uid() or agent_id = auth.uid());
create policy bookings_admin on public.bookings for update to authenticated
  using (public.auth_is_admin() or agent_id = auth.uid())
  with check (public.auth_is_admin() or agent_id = auth.uid());
create policy payments_select on public.payments for select to authenticated
  using (public.auth_is_admin() or exists (
    select 1 from public.bookings b where b.id = payments.booking_id
    and (b.buyer_id = auth.uid() or b.agent_id = auth.uid())));

-- ── cards ──
create policy cards_owner on public.business_cards for all to authenticated
  using (user_id = auth.uid() or public.auth_is_admin())
  with check (user_id = auth.uid() or public.auth_is_admin());
create policy card_shares_owner on public.card_shares for all to authenticated
  using (exists (select 1 from public.business_cards c where c.id = card_shares.card_id
                 and (c.user_id = auth.uid() or public.auth_is_admin())))
  with check (exists (select 1 from public.business_cards c where c.id = card_shares.card_id
                 and (c.user_id = auth.uid() or public.auth_is_admin())));
create policy card_scans_insert on public.card_scans for insert to authenticated
  with check (true);
create policy card_scans_owner_read on public.card_scans for select to authenticated
  using (exists (select 1 from public.business_cards c where c.id = card_scans.card_id
                 and (c.user_id = auth.uid() or public.auth_is_admin())));

-- ── notifications ──
create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_admin_insert on public.notifications for insert to authenticated
  with check (public.auth_is_admin());

-- ── audit logs: admin read only; inserts via service role / definer ──
create policy audit_admin_read on public.audit_logs for select to authenticated
  using (public.auth_is_admin());
