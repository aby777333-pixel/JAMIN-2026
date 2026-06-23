-- JAMIN Properties — 0021 blueprint gap-closure (ADDITIVE ONLY, no changes to existing logic).
-- Closes: MOD11 (remaining form types), MOD03 (7th property type), MOD06 (team rollups),
--         MOD08 (referral click tracking + fraud-control config).

-- ─── MOD 11 · seed the remaining dynamic form types (agent / promoter / property / booking) ───
insert into public.form_definitions (key, name, fields, active)
select 'agent', 'Agent Application',
  '[{"name":"experience","label":"Years in real estate","type":"number","required":false},
    {"name":"city","label":"Working city","type":"text","required":true},
    {"name":"about","label":"About you","type":"textarea","required":false}]'::jsonb, true
where not exists (select 1 from public.form_definitions where key='agent');

insert into public.form_definitions (key, name, fields, active)
select 'promoter', 'Promoter Application',
  '[{"name":"team_size","label":"Current team size","type":"number","required":false},
    {"name":"region","label":"Region / territory","type":"text","required":true},
    {"name":"motivation","label":"Why partner with JAMIN?","type":"textarea","required":false}]'::jsonb, true
where not exists (select 1 from public.form_definitions where key='promoter');

insert into public.form_definitions (key, name, fields, active)
select 'property', 'Property Listing',
  '[{"name":"highlights","label":"Key highlights","type":"textarea","required":false},
    {"name":"facing","label":"Facing","type":"select","required":false,"options":["East","West","North","South","North-East","North-West","South-East","South-West"]},
    {"name":"area_sqft","label":"Area (sq ft)","type":"number","required":false}]'::jsonb, true
where not exists (select 1 from public.form_definitions where key='property');

insert into public.form_definitions (key, name, fields, active)
select 'booking', 'Booking Form',
  '[{"name":"buyer_name","label":"Buyer name","type":"text","required":true},
    {"name":"buyer_phone","label":"Buyer phone","type":"tel","required":true},
    {"name":"payment_plan","label":"Payment plan","type":"select","required":false,"options":["Full payment","Installments","Bank loan"]}]'::jsonb, true
where not exists (select 1 from public.form_definitions where key='booking');

-- ─── MOD 03 · 7th property type (system already supports unlimited; seed one more) ───
insert into public.property_types (slug, name, code_prefix, active)
select 'office', 'Office Space', 'OF', true
where not exists (select 1 from public.property_types where slug='office');

-- ─── MOD 08/16 · default referral fraud-control config (DB-driven, Super-Admin editable) ───
insert into public.referral_rules (key, name, config, active)
select 'fraud_controls', 'Referral Fraud Controls',
  '{"block_self_referral":true,"one_account_per_phone":true,"max_signups_per_device_per_day":5}'::jsonb, true
where not exists (select 1 from public.referral_rules where key='fraud_controls');

-- ─── MOD 06 · team rollup for the caller's own subtree (revenue + sales + headcount) ───
create or replace function public.team_summary()
returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select hierarchy_path as hp from public.profiles where id = auth.uid()),
  team as (
    select p.id from public.profiles p, me
    where p.hierarchy_path <@ me.hp and p.id <> auth.uid()
  )
  select jsonb_build_object(
    'team_count',  (select count(*) from team),
    'team_sales',  (select count(*) from public.commission_ledger l join team t on t.id = l.user_id
                      where l.direction = 'credit' and l.source_ref like 'sale:%'),
    'team_revenue',(select coalesce(sum(l.amount), 0) from public.commission_ledger l join team t on t.id = l.user_id
                      where l.direction = 'credit')
  );
$$;
grant execute on function public.team_summary() to authenticated;

-- ─── MOD 08 · referral click tracking (anon-callable from the share landing) ───
create or replace function public.log_referral_click(
  p_code text, p_artifact text default 'link', p_channel text default 'link', p_device jsonb default '{}'::jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_sharer uuid;
begin
  if p_code is null or length(trim(p_code)) = 0 then return false; end if;
  select id into v_sharer from public.profiles where lower(referral_code) = lower(trim(p_code)) limit 1;
  if v_sharer is null then return false; end if;
  insert into public.referral_events (sharer_id, artifact_type, token, channel, stage, device)
  values (v_sharer, coalesce(p_artifact, 'link'), upper(trim(p_code)), coalesce(p_channel, 'link'),
          'clicked', coalesce(p_device, '{}'::jsonb));
  return true;
end $$;
grant execute on function public.log_referral_click(text, text, text, jsonb) to anon, authenticated;
