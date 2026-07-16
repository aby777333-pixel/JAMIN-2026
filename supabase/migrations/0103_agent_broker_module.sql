-- JAMIN Properties — 0103 Agent/Broker module (India): professional profile
-- fields, optional RERA/GST on KYC, monthly earnings series for the partner
-- dashboard chart, admin overview RPC for agents & brokers. FULLY ADDITIVE.
-- (Registration paths, KYC core, referral/QR/card, commission engine, clients,
-- media capture, visit feedback, statements, Academy, AI and login audit all
-- shipped in 0099–0102 and are role-generic — nothing to change there.)

-- ─── 1. Professional profile (self-managed marketing identity) ──────────────
-- One jsonb doc: agency_name, company_name, rera_number, gst_number,
-- service_areas, languages, experience_years, specialisation, bio,
-- office_address … new fields need zero schema change (rule §13).
alter table public.profiles
  add column if not exists partner_profile jsonb not null default '{}'::jsonb;

-- ─── 2. KYC: optional RERA / GST registration numbers ────────────────────────
update public.form_definitions
set fields = fields || '[
  {"name":"rera_number","type":"text","label":"RERA registration number (if applicable)","required":false},
  {"name":"gst_number","type":"text","label":"GST registration number (optional)","required":false}
]'::jsonb, updated_at = now()
where key = 'kyc'
  and not exists (select 1 from jsonb_array_elements(fields) e where e->>'name' = 'rera_number');

-- ─── 3. Monthly earnings series (drives the dashboard trend chart) ──────────
create or replace function public.my_monthly_earnings(p_months int default 6)
returns table (month date, earned numeric)
language sql security definer set search_path = public stable as $$
  select d::date as month,
    coalesce((select sum(cl.amount) from public.commission_ledger cl
      where cl.user_id = auth.uid() and cl.direction = 'credit'
        and cl.created_at >= d and cl.created_at < d + interval '1 month'), 0)
  from generate_series(
    date_trunc('month', now()) - make_interval(months => greatest(p_months, 1) - 1),
    date_trunc('month', now()), interval '1 month') d
  order by d;
$$;
revoke execute on function public.my_monthly_earnings(int) from public, anon;
grant execute on function public.my_monthly_earnings(int) to authenticated;

-- ─── 4. Admin: agents & brokers overview (mirrors admin_promoter_overview) ──
create or replace function public.admin_agent_overview()
returns table (
  user_id uuid, full_name text, role_slug text, status text,
  direct_recruits int, team_size int, assigned_buyers int, assigned_sellers int,
  listings int, month_credits numeric, total_credits numeric
)
language sql security definer set search_path = public stable as $$
  select pr.id, pr.full_name, r.slug, pr.status,
    (select count(*)::int from public.profiles c where c.parent_id = pr.id),
    (select count(*)::int - 1 from public.profiles c where c.hierarchy_path <@ pr.hierarchy_path),
    (select count(*)::int from public.profiles c join public.roles cr on cr.id = c.role_id
      where c.assigned_promoter_id = pr.id and cr.slug = 'buyer'),
    (select count(*)::int from public.profiles c join public.roles cr on cr.id = c.role_id
      where c.assigned_promoter_id = pr.id and cr.slug in ('seller', 'builder', 'developer')),
    (select count(*)::int from public.properties p where p.seller_id = pr.id),
    coalesce((select sum(cl.amount) from public.commission_ledger cl
      where cl.user_id = pr.id and cl.direction = 'credit'
        and cl.created_at >= date_trunc('month', now())), 0),
    coalesce((select sum(cl.amount) from public.commission_ledger cl
      where cl.user_id = pr.id and cl.direction = 'credit'), 0)
  from public.profiles pr
  join public.roles r on r.id = pr.role_id
  where r.slug in ('agent', 'broker') and public.auth_is_admin()
  order by pr.created_at desc;
$$;
revoke execute on function public.admin_agent_overview() from public, anon;
grant execute on function public.admin_agent_overview() to authenticated;

-- ─── 5. Feature registry ─────────────────────────────────────────────────────
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('partner_profile', 'Professional Profile', 'Agency, RERA/GST, service areas, languages, experience, specialisation — self-managed by every partner.', 'partner', 'id-card', 192),
  ('agent_console',   'Agents & Brokers Console', 'Admin overview of every agent/broker: network, clients, listings, earnings, targets, upline, suspension.', 'admin', 'briefcase', 194)
on conflict (key) do nothing;
