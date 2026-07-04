-- JAMIN Properties — 0090 targeted notifications.
-- The Everyone/Buyers/Partners broadcast gains full targeting: any single ROLE
-- (audience = 'role:<slug>'), or ONE SPECIFIC PERSON (p_user_id). New function;
-- both existing broadcast_notification overloads stay untouched.
create or replace function public.send_notification_to(
  p_title text,
  p_body text,
  p_data jsonb,
  p_audience text,          -- 'all' | 'buyers' | 'partners' | 'role:<slug>' | 'user'
  p_user_id uuid default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_role text;
begin
  if not public.auth_is_admin() then raise exception 'not authorized'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'title required'; end if;

  if p_user_id is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (p_user_id, 'broadcast', p_title, coalesce(p_body, ''),
            jsonb_build_object('segment', 'direct') || coalesce(p_data, '{}'::jsonb));
    v_count := 1;
  elsif p_audience like 'role:%' then
    v_role := substring(p_audience from 6);
    insert into public.notifications (user_id, type, title, body, data)
    select pr.id, 'broadcast', p_title, coalesce(p_body, ''),
           jsonb_build_object('segment', p_audience) || coalesce(p_data, '{}'::jsonb)
    from public.profiles pr
    join public.roles r on r.id = pr.role_id
    where r.slug = v_role;
    get diagnostics v_count = row_count;
  elsif p_audience in ('all', 'buyers', 'partners') then
    insert into public.notifications (user_id, type, title, body, data)
    select pr.id, 'broadcast', p_title, coalesce(p_body, ''),
           jsonb_build_object('segment', p_audience) || coalesce(p_data, '{}'::jsonb)
    from public.profiles pr
    where p_audience = 'all'
       or (p_audience = 'partners' and exists (select 1 from public.roles r where r.id = pr.role_id and r.level <= 6))
       or (p_audience = 'buyers' and (pr.role_id is null
              or exists (select 1 from public.roles r where r.id = pr.role_id and r.level >= 7)));
    get diagnostics v_count = row_count;
  else
    raise exception 'bad audience';
  end if;

  perform public.app_audit('broadcast.sent', 'notification', p_user_id,
          jsonb_build_object('audience', case when p_user_id is not null then 'user' else p_audience end,
                             'count', v_count));
  return v_count;
end $$;
revoke execute on function public.send_notification_to(text, text, jsonb, text, uuid) from public, anon;
grant execute on function public.send_notification_to(text, text, jsonb, text, uuid) to authenticated;
