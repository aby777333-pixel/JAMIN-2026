-- JAMIN Properties — 0011 deterministic commission engine (§5.10, §8, §14).
-- On a closed sale the engine resolves active commission_rules against the property
-- and credits the selling agent (direct) plus every ancestor in the hierarchy (team
-- overrides) into the append-only ledger. Exact NUMERIC math; idempotent per sale.

-- amount from a formula jsonb: percent | flat | slab
create or replace function public.compute_commission(p_price numeric, p_formula jsonb)
returns numeric language plpgsql immutable set search_path = public as $$
declare
  v_type text := p_formula->>'type';
  v_slab jsonb;
  v_upto numeric;
  v_amt  numeric := 0;
begin
  if v_type = 'percent' then
    v_amt := p_price * coalesce((p_formula->>'value')::numeric, 0) / 100;
  elsif v_type = 'flat' then
    v_amt := coalesce((p_formula->>'value')::numeric, 0);
  elsif v_type = 'slab' then
    for v_slab in select * from jsonb_array_elements(coalesce(p_formula->'slabs', '[]'::jsonb)) loop
      v_upto := nullif(v_slab->>'upto', '')::numeric;
      if v_upto is null or p_price <= v_upto then
        v_amt := p_price * coalesce((v_slab->>'percent')::numeric, 0) / 100;
        exit;
      end if;
    end loop;
  end if;
  return round(v_amt, 2);
end $$;

-- does a rule's match jsonb apply to this property?
create or replace function public.rule_matches(p_match jsonb, p_project uuid, p_plan uuid, p_type uuid)
returns boolean language sql immutable set search_path = public as $$
  select
    (not (p_match ? 'project_id')       or p_match->>'project_id' = p_project::text)
    and (not (p_match ? 'plan_id')      or p_match->>'plan_id' = coalesce(p_plan::text, ''))
    and (not (p_match ? 'property_type_id') or p_match->>'property_type_id' = p_type::text);
$$;

-- the engine: credit direct agent + team overrides up the hierarchy. Idempotent.
create or replace function public.run_commission_for_property(p_property uuid, p_agent uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_price numeric; v_project uuid; v_plan uuid; v_type uuid;
  v_agent_role uuid; v_agent_path ltree;
  v_rule record; v_anc record;
  v_amt numeric; v_total numeric := 0;
begin
  if exists (select 1 from public.commission_ledger where source_ref = 'sale:' || p_property) then
    return 0; -- already settled for this sale
  end if;

  select price, project_id, plan_id, property_type_id
    into v_price, v_project, v_plan, v_type
    from public.properties where id = p_property;
  if v_price is null then raise exception 'unknown property %', p_property; end if;

  if p_agent is not null then
    select role_id, hierarchy_path into v_agent_role, v_agent_path
      from public.profiles where id = p_agent;

    -- DIRECT: best matching non-team rule (highest priority = lowest number)
    select * into v_rule from public.commission_rules
      where active and scope in ('property','project','plan','slab','bonus')
        and public.rule_matches(match, v_project, v_plan, v_type)
      order by priority asc, created_at asc
      limit 1;
    if found then
      v_amt := public.compute_commission(v_price, v_rule.formula);
      if v_amt > 0 then
        insert into public.commission_ledger(user_id, source_ref, role_id, amount, direction, status)
        values (p_agent, 'sale:' || p_property, v_agent_role, v_amt, 'credit', 'posted');
        v_total := v_total + v_amt;
      end if;
    end if;

    -- TEAM OVERRIDES: each active 'team' rule pays matching ancestors
    for v_rule in
      select * from public.commission_rules
      where active and scope = 'team'
        and public.rule_matches(match, v_project, v_plan, v_type)
    loop
      v_amt := public.compute_commission(v_price, v_rule.formula);
      continue when v_amt <= 0;
      for v_anc in
        select id, role_id from public.profiles
        where hierarchy_path @> v_agent_path and id <> p_agent
          and (not (v_rule.match ? 'role_id') or role_id::text = v_rule.match->>'role_id')
      loop
        insert into public.commission_ledger(user_id, source_ref, role_id, amount, direction, status)
        values (v_anc.id, 'sale:' || p_property, v_anc.role_id, v_amt, 'credit', 'posted');
        v_total := v_total + v_amt;
      end loop;
    end loop;
  end if;

  insert into public.audit_logs(actor_id, action, entity, entity_id, payload)
  values (p_agent, 'commission_run', 'property', p_property,
          jsonb_build_object('total', v_total, 'price', v_price));
  return v_total;
end $$;

-- Admin-controlled sale close: booking won -> property sold (fires auto-replace) -> pay commissions.
create or replace function public.close_sale(p_booking uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_prop uuid; v_agent uuid; v_total numeric;
begin
  if not public.auth_is_admin() then raise exception 'admin only'; end if;
  select property_id, agent_id into v_prop, v_agent from public.bookings where id = p_booking;
  if v_prop is null then raise exception 'unknown booking %', p_booking; end if;
  update public.bookings set status = 'won' where id = p_booking;
  update public.properties set status = 'sold' where id = v_prop;
  v_total := public.run_commission_for_property(v_prop, v_agent);
  return v_total;
end $$;

-- Attribution (§8): record the referral binding event during onboarding.
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

  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select * into v_ref from public.profiles
      where referral_code = upper(trim(p_referral_code)) and id <> v_self;
    if found then
      update public.profiles
        set full_name = p_full_name, phone = p_phone,
            parent_id = v_ref.id,
            hierarchy_path = v_ref.hierarchy_path || text2ltree(public.uuid_label(v_self))
        where id = v_self;
      insert into public.referral_events(sharer_id, prospect_id, artifact_type, channel, stage, fraud_score)
      values (v_ref.id, v_self, 'link', 'referral_code', 'assigned', 0);
      return;
    end if;
  end if;

  update public.profiles set full_name = p_full_name, phone = p_phone where id = v_self;
end $$;

-- Demo: a team override on top of the existing 2% direct rule.
insert into public.commission_rules (name, scope, match, formula, priority)
select 'Team override 1% on Jamin Greens', 'team',
       jsonb_build_object('project_id', p.id),
       '{"type":"percent","value":1}'::jsonb, 60
from public.projects p where p.code = 'JP-A'
on conflict do nothing;

-- Lock down: helpers/engine are not public RPCs (close_sale is the entry point).
revoke execute on function public.compute_commission(numeric, jsonb) from public, anon, authenticated;
revoke execute on function public.rule_matches(jsonb, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.run_commission_for_property(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.close_sale(uuid) to authenticated;
