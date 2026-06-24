-- JAMIN Properties — 0026 per-member team monitoring (MOD06 Promoter Portal).
-- ADDITIVE ONLY. One subtree-guarded RPC; no table/policy/existing-function change.

-- team_member_stats(member) — drill-down metrics for one downline member.
-- SECURITY DEFINER (bypasses RLS) so the guard is enforced in-function: the caller
-- must be the member themselves, an ancestor (member is in the caller's subtree), or admin.
create or replace function public.team_member_stats(p_member uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_caller_path ltree;
  v_member      public.profiles%rowtype;
  v_allowed     boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_member from public.profiles where id = p_member;
  if not found then return null; end if;

  select hierarchy_path into v_caller_path from public.profiles where id = auth.uid();
  v_allowed := public.auth_is_admin()
            or p_member = auth.uid()
            or (v_caller_path is not null and v_member.hierarchy_path <@ v_caller_path);
  if not v_allowed then raise exception 'not permitted'; end if;

  return jsonb_build_object(
    'id',            v_member.id,
    'full_name',     v_member.full_name,
    'referral_code', v_member.referral_code,
    'joined_at',     v_member.created_at,
    'role',          (select name from public.roles where id = v_member.role_id),
    'territory',     (select name from public.territories where id = v_member.territory_id),
    'direct',        (select count(*) from public.profiles where parent_id = p_member),
    'team',          (select count(*) from public.profiles p
                        where p.hierarchy_path <@ v_member.hierarchy_path and p.id <> p_member),
    'sales',         (select count(*) from public.commission_ledger
                        where user_id = p_member and direction = 'credit' and source_ref like 'sale:%'),
    'earnings',      (select coalesce(sum(amount), 0) from public.commission_ledger
                        where user_id = p_member and direction = 'credit'),
    'team_revenue',  (select coalesce(sum(l.amount), 0) from public.commission_ledger l
                        join public.profiles p on p.id = l.user_id
                        where p.hierarchy_path <@ v_member.hierarchy_path and l.direction = 'credit')
  );
end $$;
grant execute on function public.team_member_stats(uuid) to authenticated;
