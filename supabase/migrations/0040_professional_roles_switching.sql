-- JAMIN Properties — 0040 professional roles + self-service role switching.
-- Adds Seller/Builder/Developer/Surveyor/Legal Consultant/Broker as dynamic role
-- rows (§13 — no hardcoded enums) and lets a user switch between self-selectable,
-- non-admin roles without a new account. Escalation to management/admin is blocked.

-- Which roles a user may pick for themselves (entry/professional tier only).
alter table public.roles add column if not exists self_selectable boolean not null default false;

-- New professional partner roles (entry tier, level 6 → 'sell' capability).
insert into public.roles (slug, name, level, is_admin, self_selectable, permissions) values
  ('seller',           'Seller',            6, false, true, '{}'::jsonb),
  ('builder',          'Builder',           6, false, true, '{}'::jsonb),
  ('developer',        'Developer',         6, false, true, '{}'::jsonb),
  ('surveyor',         'Surveyor',          6, false, true, '{}'::jsonb),
  ('legal_consultant', 'Legal Consultant',  6, false, true, '{}'::jsonb),
  ('broker',           'Broker',            6, false, true, '{}'::jsonb)
on conflict (slug) do nothing;

-- Buyer & Agent are also freely self-selectable (downgrade / entry partner).
update public.roles set self_selectable = true where slug in ('buyer', 'agent');

-- Self-service role switch. Trusted (bypasses guard_profile_columns) but strictly
-- limited to self_selectable, non-admin roles — never promoter+/admin.
create or replace function public.switch_role(p_slug text)
returns text language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_role public.roles%rowtype;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select * into v_role from public.roles where slug = p_slug;
  if not found then raise exception 'unknown role'; end if;
  if v_role.is_admin or not coalesce(v_role.self_selectable, false) then
    raise exception 'role not self-selectable';
  end if;
  perform set_config('jamin.trusted', 'on', true);
  update public.profiles set role_id = v_role.id where id = v_self;
  return p_slug;
end $$;
revoke execute on function public.switch_role(text) from public, anon;
grant  execute on function public.switch_role(text) to authenticated;
