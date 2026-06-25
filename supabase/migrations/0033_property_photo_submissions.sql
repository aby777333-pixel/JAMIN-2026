-- 0033 — Promoter photo contributions with admin approval.
-- Partners submit photos for a specific property; they land in a pending queue.
-- Admin approves (photo is appended to the property's media) or rejects. Additive.

-- ── Storage: dedicated submissions bucket ────────────────────────────────────
-- Promoters upload here (own folder); only admins can delete, so an approved
-- photo URL stays stable. Public read (same as property-media).
insert into storage.buckets (id, name, public)
values ('property-submissions', 'property-submissions', true)
on conflict (id) do nothing;

drop policy if exists prop_sub_read   on storage.objects;
drop policy if exists prop_sub_insert on storage.objects;
drop policy if exists prop_sub_delete on storage.objects;
create policy prop_sub_read on storage.objects for select
  using (bucket_id = 'property-submissions');
create policy prop_sub_insert on storage.objects for insert
  with check (bucket_id = 'property-submissions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy prop_sub_delete on storage.objects for delete
  using (bucket_id = 'property-submissions' and public.auth_is_admin());

-- ── Submissions table ────────────────────────────────────────────────────────
create table if not exists public.property_media_submissions (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  submitted_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  url          text not null,
  path         text not null,
  name         text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by  uuid references public.profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_prop_sub_property on public.property_media_submissions(property_id);
create index if not exists idx_prop_sub_status   on public.property_media_submissions(status);

alter table public.property_media_submissions enable row level security;

drop policy if exists prop_sub_own_select on public.property_media_submissions;
drop policy if exists prop_sub_own_insert on public.property_media_submissions;
drop policy if exists prop_sub_admin_upd  on public.property_media_submissions;
create policy prop_sub_own_select on public.property_media_submissions for select
  using (submitted_by = auth.uid() or public.auth_is_admin());
create policy prop_sub_own_insert on public.property_media_submissions for insert
  with check (submitted_by = auth.uid());
create policy prop_sub_admin_upd on public.property_media_submissions for update
  using (public.auth_is_admin()) with check (public.auth_is_admin());

grant select, insert, update on public.property_media_submissions to authenticated;

-- ── Atomic approve: append the photo to the property, mark reviewed ──────────
create or replace function public.approve_photo_submission(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if not public.auth_is_admin() then raise exception 'not authorized'; end if;
  select * into s from public.property_media_submissions where id = p_id and status = 'pending';
  if not found then raise exception 'submission not found or already reviewed'; end if;
  update public.properties
    set media = coalesce(media, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('url', s.url))
    where id = s.property_id;
  update public.property_media_submissions
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
end $$;

revoke execute on function public.approve_photo_submission(uuid) from anon;
grant execute on function public.approve_photo_submission(uuid) to authenticated;
