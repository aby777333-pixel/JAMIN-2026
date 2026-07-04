-- JAMIN Properties — 0086 "→ Assign" must always assign to someone.
-- auto_assign_lead previously raised 'no agents in the routing pool' whenever
-- the admin hadn't saved a routing pool (the default), so the CRM Assign button
-- appeared to do nothing. New fallback chain:
--   1) saved routing pool → round-robin (existing behaviour, unchanged);
--   2) pool empty → the ACTIVE partner (Agent-level or above, non-admin) with
--      the fewest open leads, so work spreads fairly;
--   3) no partners yet → the first admin (lead is never orphaned).
-- Same signature and return; route_lead still notifies + audits — no caller changes.
create or replace function public.auto_assign_lead(p_lead uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb;
  v_pool jsonb;
  v_cursor int;
  v_len int;
  v_agent uuid;
begin
  if not public.auth_is_admin() then raise exception 'not authorized'; end if;

  select value into v_cfg from public.system_config where key = 'lead_routing';
  v_pool := coalesce(v_cfg->'pool', '[]'::jsonb);
  v_len := jsonb_array_length(v_pool);

  if v_len > 0 then
    -- 1) round-robin through the saved pool (unchanged).
    v_cursor := coalesce((v_cfg->>'cursor')::int, 0);
    v_agent := (v_pool->>(v_cursor % v_len))::uuid;
    update public.system_config
       set value = jsonb_set(value, '{cursor}', to_jsonb(v_cursor + 1))
     where key = 'lead_routing';
  else
    -- 2) least-loaded active partner (Agent level or above, never an admin).
    select p.id into v_agent
      from public.profiles p
      join public.roles r on r.id = p.role_id
     where not r.is_admin
       and r.level <= 6
       and coalesce(p.status, 'active') = 'active'
     order by (select count(*) from public.leads l
                where l.owner_id = p.id
                  and l.status in ('new', 'contacted', 'qualified', 'visit')) asc,
              p.created_at asc
     limit 1;

    -- 3) still nobody → first admin keeps the lead from being orphaned.
    if v_agent is null then
      select p.id into v_agent
        from public.profiles p
        join public.roles r on r.id = p.role_id
       where r.is_admin
       order by p.created_at limit 1;
    end if;
  end if;

  if v_agent is null then
    raise exception 'No one to assign to yet — add partners in Users & roles.';
  end if;

  perform public.route_lead(p_lead, v_agent);
  return v_agent;
end $$;
