-- JAMIN Properties — 0088 rich broadcasts + bulk emailer plumbing.
-- 1) broadcast_notification gains a 4-arg OVERLOAD carrying attachments
--    (image / file / link) in notifications.data. The original 3-arg function
--    is untouched, so every existing caller keeps working bit-for-bit.
-- 2) email_outbox — send log for the bulk CSV emailer (email-send edge fn,
--    inert until a Resend key exists in app_secrets).

create or replace function public.broadcast_notification(
  p_title text, p_body text, p_segment text, p_data jsonb
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.auth_is_admin() then raise exception 'not authorized'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'title required'; end if;
  if p_segment not in ('all', 'buyers', 'partners') then raise exception 'bad segment'; end if;

  insert into public.notifications (user_id, type, title, body, data)
  select pr.id, 'broadcast', p_title, coalesce(p_body, ''),
         jsonb_build_object('segment', p_segment) || coalesce(p_data, '{}'::jsonb)
  from public.profiles pr
  where p_segment = 'all'
     or (p_segment = 'partners' and exists (select 1 from public.roles r where r.id = pr.role_id and r.level <= 6))
     or (p_segment = 'buyers' and (pr.role_id is null
            or exists (select 1 from public.roles r where r.id = pr.role_id and r.level >= 7)));
  get diagnostics v_count = row_count;
  perform public.app_audit('broadcast.sent', 'notification', null::uuid,
          jsonb_build_object('segment', p_segment, 'count', v_count,
                             'has_media', coalesce(p_data, '{}'::jsonb) <> '{}'::jsonb));
  return v_count;
end $$;
revoke execute on function public.broadcast_notification(text, text, text, jsonb) from public, anon;
grant execute on function public.broadcast_notification(text, text, text, jsonb) to authenticated;

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text,
  kind text not null default 'campaign',
  status text not null default 'queued',  -- sent | failed
  error text,
  created_at timestamptz not null default now()
);
alter table public.email_outbox enable row level security;
create policy email_outbox_admin on public.email_outbox
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
grant select on public.email_outbox to authenticated;
