-- JAMIN Properties — 0039 buyer requirements + property radar.
-- Buyers save what they're looking for; when a matching listing becomes publicly
-- visible (approved + available), matching buyers are notified. Additive & safe.

create table if not exists public.buyer_requirements (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  label            text,
  location         text,
  budget_min       numeric(18,2),
  budget_max       numeric(18,2),
  property_type_id uuid references public.property_types(id) on delete set null,
  min_area         text,
  purpose          text,
  notify           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_buyer_req_user on public.buyer_requirements(user_id);
drop trigger if exists trg_buyer_req_updated on public.buyer_requirements;
create trigger trg_buyer_req_updated before update on public.buyer_requirements
  for each row execute function public.set_updated_at();

alter table public.buyer_requirements enable row level security;
drop policy if exists buyer_req_own on public.buyer_requirements;
create policy buyer_req_own on public.buyer_requirements for all to authenticated
  using (user_id = auth.uid() or public.auth_is_admin())
  with check (user_id = auth.uid() or public.auth_is_admin());

grant select, insert, update, delete on public.buyer_requirements to authenticated;

-- Radar: notify matching buyers when a listing becomes publicly visible.
create or replace function public.notify_matching_buyers()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_loc text;
begin
  -- Only when the listing is (now) approved + available...
  if not (new.approval_status = 'approved' and new.status = 'available') then
    return null;
  end if;
  -- ...and it just transitioned into that state (skip ordinary edits).
  if tg_op = 'UPDATE' and old.approval_status = 'approved' and old.status = 'available' then
    return null;
  end if;
  begin
    select location into v_loc from public.projects where id = new.project_id;
    insert into public.notifications(user_id, type, title, body, data)
    select r.user_id, 'match', 'New property matches your requirement',
           'A new listing matches what you''re looking for.',
           jsonb_build_object('property_id', new.id, 'requirement_id', r.id)
    from public.buyer_requirements r
    where r.notify = true
      and new.price >= coalesce(r.budget_min, 0)
      and new.price <= coalesce(r.budget_max, 9e18)
      and (r.property_type_id is null or r.property_type_id = new.property_type_id)
      and (r.location is null or r.location = ''
           or (v_loc is not null and v_loc ilike '%' || r.location || '%'))
      and r.user_id <> coalesce(new.seller_id, '00000000-0000-0000-0000-000000000000'::uuid);
  exception when others then
    return null; -- radar must never block a listing write
  end;
  return null;
end $$;
drop trigger if exists trg_notify_matching_buyers on public.properties;
create trigger trg_notify_matching_buyers after insert or update on public.properties
  for each row execute function public.notify_matching_buyers();
