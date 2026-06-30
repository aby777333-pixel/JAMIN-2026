-- JAMIN Properties — 0047 RERA registration & verification.
-- Adds RERA fields to projects (the canonical unit of registration in India) plus
-- an admin-only verify_rera() RPC that stamps verifier + time and writes an audit
-- entry. Listings inherit the badge from their project. Additive & regression-safe.

alter table public.projects
  add column if not exists rera_number      text,
  add column if not exists rera_status      text not null default 'not_applicable',
  add column if not exists rera_valid_till  date,
  add column if not exists rera_verified_by uuid,
  add column if not exists rera_verified_at timestamptz,
  add column if not exists rera_doc_path    text;

-- Constrain the status values (guarded so re-running is safe).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_rera_status_chk'
  ) then
    alter table public.projects
      add constraint projects_rera_status_chk
      check (rera_status in ('registered','pending','expired','not_applicable'));
  end if;
end $$;

-- Admin-only RERA verification (centralises the audit trail).
create or replace function public.verify_rera(
  p_project uuid,
  p_number text,
  p_status text,
  p_valid_till date default null,
  p_doc_path text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_is_admin() then raise exception 'not authorized'; end if;
  if p_status not in ('registered','pending','expired','not_applicable') then
    raise exception 'bad rera status';
  end if;
  update public.projects
    set rera_number      = nullif(trim(coalesce(p_number, '')), ''),
        rera_status      = p_status,
        rera_valid_till  = p_valid_till,
        rera_doc_path    = coalesce(p_doc_path, rera_doc_path),
        rera_verified_by = auth.uid(),
        rera_verified_at = now()
    where id = p_project;
  perform public.app_audit('rera.' || p_status, 'project', p_project,
          jsonb_build_object('number', p_number, 'valid_till', p_valid_till));
end $$;
revoke execute on function public.verify_rera(uuid, text, text, date, text) from public, anon;
grant  execute on function public.verify_rera(uuid, text, text, date, text) to authenticated;
