-- JAMIN Properties — 0105 visit routing guard: even a lead-pool pick must never
-- equal the property's true-seller owner (or the buyer). If it does, route to
-- the first admin instead. Complements 0104 — the pool is admin-configured
-- data and may (mis)contain a seller; contact isolation must win regardless.

create or replace function public.book_site_visit(
  p_property uuid, p_scheduled_at timestamptz, p_note text default null, p_contact jsonb default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_self uuid := auth.uid(); v_agent uuid; v_id uuid; v_contact jsonb; v_name text; v_phone text;
  v_owner uuid; v_owner_sales boolean := false;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  if p_scheduled_at is null or p_scheduled_at <= now() then raise exception 'pick a future time'; end if;
  if not exists (select 1 from public.properties where id = p_property) then raise exception 'property not found'; end if;

  select p.seller_id,
         coalesce(r.slug in ('agent', 'broker', 'promoter', 'sub_promoter') or r.is_admin, false)
    into v_owner, v_owner_sales
    from public.properties p
    left join public.profiles pr on pr.id = p.seller_id
    left join public.roles r on r.id = pr.role_id
   where p.id = p_property;

  -- Contact isolation: only JAMIN's sales side ever receives buyer contact.
  if v_owner is not null and v_owner_sales and v_owner <> v_self then
    v_agent := v_owner;
  else
    v_agent := public.pick_pool_agent();
    if v_agent is not null and (v_agent = v_self or (v_owner is not null and not v_owner_sales and v_agent = v_owner)) then
      select p.id into v_agent
        from public.profiles p join public.roles r on r.id = p.role_id
       where r.is_admin and p.id <> v_self
       order by p.created_at limit 1;
    end if;
  end if;

  if p_contact is not null then
    v_contact := p_contact;
  else
    select full_name, phone into v_name, v_phone from public.profiles where id = v_self;
    v_contact := jsonb_strip_nulls(jsonb_build_object('name', v_name, 'phone', v_phone));
  end if;

  insert into public.site_visits(property_id, buyer_id, agent_id, scheduled_at, notes, buyer_contact, status)
  values (p_property, v_self, v_agent, p_scheduled_at, p_note, coalesce(v_contact, '{}'::jsonb), 'requested')
  returning id into v_id;

  if v_agent is not null and v_agent <> v_self then
    insert into public.notifications(user_id, type, title, body, data)
    values (v_agent, 'site_visit', 'New site-visit request',
            'A buyer requested a property visit.',
            jsonb_build_object('site_visit_id', v_id, 'property_id', p_property, 'scheduled_at', p_scheduled_at));
  end if;
  perform public.app_audit('site_visit.requested', 'site_visit', v_id,
          jsonb_build_object('property_id', p_property, 'scheduled_at', p_scheduled_at));
  return v_id;
end $$;
revoke execute on function public.book_site_visit(uuid, timestamptz, text, jsonb) from public, anon;
grant execute on function public.book_site_visit(uuid, timestamptz, text, jsonb) to authenticated;
