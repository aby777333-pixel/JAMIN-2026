-- JAMIN Properties — 0042 anon-readable self-selectable roles.
-- The roles table is authenticated-only (RLS), but the registration screen runs
-- for anonymous visitors, so it couldn't load the role dropdown. Expose ONLY the
-- self-selectable, non-admin roles through a SECURITY DEFINER function callable by
-- anon (management roles are never returned).
create or replace function public.public_selectable_roles()
returns table (id uuid, slug text, name text, level int)
language sql security definer set search_path = public stable as $$
  select r.id, r.slug, r.name, r.level
  from public.roles r
  where r.self_selectable = true and r.is_admin = false
  order by r.level, r.name;
$$;
grant execute on function public.public_selectable_roles() to anon, authenticated;
