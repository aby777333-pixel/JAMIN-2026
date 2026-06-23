-- JAMIN Properties — 0002 profiles, hierarchy (ltree), auth glue.
-- §4 onboarding, §13 dynamic roles, §8 hierarchy subtree (hierarchy_path <@ my_path).
-- ltree labels must be [A-Za-z0-9_]; UUIDs contain '-', so labels = hyphen-stripped hex.

create or replace function public.uuid_label(p uuid)
returns text language sql immutable as $$
  select replace(p::text, '-', '');
$$;

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  role_id        uuid references public.roles(id),
  parent_id      uuid references public.profiles(id) on delete set null,
  hierarchy_path ltree not null,
  referral_code  text unique not null,
  designation    text,
  full_name      text,
  photo_url      text,
  phone          text,
  phone_verified boolean not null default false,
  email          text,
  kyc_status     text not null default 'unverified'
                   check (kyc_status in ('unverified','pending','verified','rejected')),
  territory_id   uuid references public.territories(id) on delete set null,
  language       text not null default 'en',
  status         text not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_profiles_hierarchy on public.profiles using gist (hierarchy_path);
create index idx_profiles_parent on public.profiles(parent_id);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Unique, human-friendly referral code (Crockford-ish alphabet, no ambiguous chars).
create or replace function public.gen_referral_code()
returns text language plpgsql as $$
declare
  alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end $$;

-- New auth user -> profile row (default role: buyer, self-rooted hierarchy path).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_buyer uuid;
begin
  select id into v_buyer from public.roles where slug = 'buyer';
  insert into public.profiles (id, email, role_id, referral_code, hierarchy_path)
  values (
    new.id,
    new.email,
    v_buyer,
    public.gen_referral_code(),
    text2ltree(public.uuid_label(new.id))
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── RLS helpers (SECURITY DEFINER => read profiles without re-triggering RLS,
--     which is what prevents the classic profiles-policy recursion). ───────────
create or replace function public.auth_role_slug()
returns text language sql stable security definer set search_path = public as $$
  select r.slug from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function public.auth_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select r.is_admin from public.profiles p
     join public.roles r on r.id = p.role_id
     where p.id = auth.uid()),
    false);
$$;

create or replace function public.auth_hierarchy_path()
returns ltree language sql stable security definer set search_path = public as $$
  select hierarchy_path from public.profiles where id = auth.uid();
$$;

-- ─── Onboarding: set name/phone and bind into the referrer's subtree (§4). ────
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
  if v_self is null then
    raise exception 'not authenticated';
  end if;

  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select * into v_ref from public.profiles
      where referral_code = upper(trim(p_referral_code)) and id <> v_self;
    if found then
      update public.profiles
        set full_name = p_full_name,
            phone = p_phone,
            parent_id = v_ref.id,
            hierarchy_path = v_ref.hierarchy_path || text2ltree(public.uuid_label(v_self))
        where id = v_self;
      return;
    end if;
  end if;

  update public.profiles
    set full_name = p_full_name, phone = p_phone
    where id = v_self;
end $$;
