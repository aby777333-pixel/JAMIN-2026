-- 0094: public role model + switch-role safety
-- Owner's role model: Super Admin (full access, admin-assigned) · Promoter ·
-- Sub Promoter (admin-assigned) · Agent / Broker · Seller · Buyer.
-- Incident: the owner's super_admin account self-switched to Seller via the
-- Switch-role screen and could not return (self-promotion is blocked by
-- design). This migration removes the niche self-service roles from pickers
-- and blocks admin/management accounts from self-demoting.

-- 1) Professional niche roles are no longer self-service options. Existing
--    holders keep their role and access; admins can still assign them.
update public.roles set self_selectable = false
where slug in ('builder', 'developer', 'legal_consultant', 'surveyor');

-- 2) switch_role hardening: callers whose CURRENT role is admin or a
--    management rank (level < 6 — Super Admin, State Head, Regional Manager,
--    Promoter, Sub Promoter) may not switch themselves; those ranks are
--    admin-assigned. Target-role checks unchanged.
create or replace function public.switch_role(p_slug text)
returns text language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_role public.roles%rowtype;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  if exists (
    select 1 from public.profiles p join public.roles r on r.id = p.role_id
    where p.id = v_self and (r.is_admin or coalesce(r.level, 99) < 6)
  ) then
    raise exception 'Your role is assigned by an admin — ask an admin to change it.';
  end if;
  select * into v_role from public.roles where slug = p_slug;
  if not found then raise exception 'unknown role'; end if;
  if v_role.is_admin or not coalesce(v_role.self_selectable, false) then
    raise exception 'role not self-selectable';
  end if;
  perform set_config('jamin.trusted', 'on', true);
  update public.profiles set role_id = v_role.id where id = v_self;
  return p_slug;
end $$;
