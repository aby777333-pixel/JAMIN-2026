-- JAMIN Properties — 0036 open recruiting.
-- Anyone who wants to (or is invited) can become a partner: a signed-in Buyer
-- self-upgrades to Agent (entry partner) in one tap. SECURITY DEFINER + the
-- trusted flag is required because role_id is otherwise frozen for non-admins by
-- guard_profile_columns (0014). Guarded so it can ONLY promote buyer→agent —
-- never to promoter/admin or any escalation. Senior roles (Promoter, etc.) still
-- go through the application form → admin review.

create or replace function public.become_partner()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_self  uuid := auth.uid();
  v_agent uuid;
  v_buyer uuid;
  v_cur   uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select id into v_agent from public.roles where slug = 'agent';
  select id into v_buyer from public.roles where slug = 'buyer';
  select role_id into v_cur from public.profiles where id = v_self;

  -- only a buyer (or someone with no role) may self-promote, and only to Agent.
  if v_cur is null or v_cur = v_buyer then
    perform set_config('jamin.trusted', 'on', true);
    update public.profiles set role_id = v_agent where id = v_self;
    return 'agent';
  end if;

  -- already a partner/admin — no change.
  return (select slug from public.roles where id = v_cur);
end $$;

revoke execute on function public.become_partner() from public, anon;
grant  execute on function public.become_partner() to authenticated;
