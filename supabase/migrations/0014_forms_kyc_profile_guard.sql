-- JAMIN Properties — 0014 dynamic form submissions + KYC + profile-column guard.
-- Security: RLS lets a user UPDATE their own profile row, but must NOT let them
-- self-escalate role/hierarchy/kyc/status. A BEFORE UPDATE trigger preserves those
-- protected columns for non-admins; trusted SECURITY DEFINER functions opt out via
-- a transaction-local flag.

create table public.form_submissions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  form_key   text not null,
  data       jsonb not null default '{}'::jsonb,
  status     text not null default 'submitted',
  created_at timestamptz not null default now()
);
create index idx_form_submissions_user on public.form_submissions(user_id);

alter table public.form_submissions enable row level security;
create policy form_submissions_own on public.form_submissions for all to authenticated
  using (user_id = auth.uid() or public.auth_is_admin())
  with check (user_id = auth.uid() or public.auth_is_admin());

-- Protect privileged profile columns from self-service edits.
create or replace function public.guard_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('jamin.trusted', true), '') = 'on' then return new; end if;
  if public.auth_is_admin() then return new; end if;
  -- non-admin self-update: keep protected columns at their previous values
  new.role_id        := old.role_id;
  new.parent_id      := old.parent_id;
  new.hierarchy_path := old.hierarchy_path;
  new.kyc_status     := old.kyc_status;
  new.status         := old.status;
  new.referral_code  := old.referral_code;
  return new;
end $$;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- Onboarding must set hierarchy_path/parent — opt into trusted mode.
create or replace function public.complete_onboarding(
  p_full_name text,
  p_phone text,
  p_referral_code text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_self uuid := auth.uid();
  v_ref  public.profiles%rowtype;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  perform set_config('jamin.trusted', 'on', true);

  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select * into v_ref from public.profiles
      where referral_code = upper(trim(p_referral_code)) and id <> v_self;
    if found then
      update public.profiles
        set full_name = p_full_name, phone = p_phone,
            parent_id = v_ref.id,
            hierarchy_path = v_ref.hierarchy_path || text2ltree(public.uuid_label(v_self))
        where id = v_self;
      insert into public.referral_events(sharer_id, prospect_id, artifact_type, channel, stage, fraud_score)
      values (v_ref.id, v_self, 'link', 'referral_code', 'assigned', 0);
      return;
    end if;
  end if;

  update public.profiles set full_name = p_full_name, phone = p_phone where id = v_self;
end $$;

-- KYC submission (§4): store the dynamic form answers + mark profile pending.
create or replace function public.submit_kyc(p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid();
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  perform set_config('jamin.trusted', 'on', true);
  insert into public.form_submissions(user_id, form_key, data, status)
  values (v_self, 'kyc', p_data, 'submitted');
  update public.profiles set kyc_status = 'pending' where id = v_self;
end $$;

revoke execute on function public.submit_kyc(jsonb) from public, anon;
grant  execute on function public.submit_kyc(jsonb) to authenticated;
