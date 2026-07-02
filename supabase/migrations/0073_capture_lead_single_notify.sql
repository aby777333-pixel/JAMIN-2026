-- 0073: the existing on_lead_notify trigger already notifies the owner on every
-- lead INSERT, so capture_lead's own notify duplicated it. Keep exactly one.
create or replace function public.capture_lead(
  p_user uuid, p_name text, p_phone text, p_source text,
  p_property uuid, p_summary text, p_data jsonb default '{}'::jsonb,
  p_stage text default 'new'
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_lead uuid; v_owner uuid; v_status text; v_rank int; v_new_rank int;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if p_user is not null then
    select coalesce(v_name, full_name), coalesce(v_phone, phone)
      into v_name, v_phone from public.profiles where id = p_user;
  end if;

  select id, status into v_lead, v_status from public.leads
    where status not in ('won', 'lost')
      and ((p_user is not null and user_id = p_user)
        or (v_phone is not null and contact->>'phone' = v_phone))
    order by created_at desc limit 1;

  if v_lead is not null then
    v_rank := case v_status when 'new' then 1 when 'contacted' then 2 when 'qualified' then 3 when 'visit' then 4 else 5 end;
    v_new_rank := case p_stage when 'new' then 1 when 'contacted' then 2 when 'qualified' then 3 when 'visit' then 4 else 1 end;
    update public.leads set
      last_touch_at = now(),
      property_id = coalesce(property_id, p_property),
      user_id = coalesce(user_id, p_user),
      status = case when v_new_rank > v_rank then p_stage else status end,
      stage_changed_at = case when v_new_rank > v_rank then now() else stage_changed_at end
      where id = v_lead;
    insert into public.lead_events (lead_id, kind, summary, data)
      values (v_lead, p_source, p_summary, coalesce(p_data, '{}'::jsonb));
    return v_lead;
  end if;

  v_owner := public.pick_pool_agent();
  if v_owner is null then return null; end if;
  insert into public.leads (owner_id, user_id, source, status, contact, property_id, last_touch_at, stage_changed_at)
    values (v_owner, p_user, p_source, coalesce(nullif(p_stage, ''), 'new'),
            jsonb_strip_nulls(jsonb_build_object('name', v_name, 'phone', v_phone)),
            p_property, now(), now())
    returning id into v_lead;
  insert into public.lead_events (lead_id, kind, summary, data)
    values (v_lead, 'created', coalesce(p_summary, 'Lead captured'),
            coalesce(p_data, '{}'::jsonb) || jsonb_build_object('source', p_source));
  -- creation notification comes from the existing on_lead_notify trigger
  return v_lead;
end $$;
