-- JAMIN Properties — 0041 capture signup metadata into the profile.
-- handle_new_user now reads full_name / phone / intended_role from the auth signup
-- metadata so a registration form populates the profile immediately (admin sees it).
-- intended_role is honoured ONLY if it is a self_selectable, non-admin role — so
-- management roles can never be self-assigned at signup. Fully backward compatible:
-- OTP signups (no metadata) behave exactly as before (buyer, name null → onboarding).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role  uuid;
  v_slug  text := nullif(new.raw_user_meta_data->>'intended_role', '');
  v_name  text := nullif(new.raw_user_meta_data->>'full_name', '');
  v_phone text := nullif(new.raw_user_meta_data->>'phone', '');
begin
  if v_slug is not null then
    select id into v_role from public.roles
      where slug = v_slug and self_selectable = true and is_admin = false;
  end if;
  if v_role is null then
    select id into v_role from public.roles where slug = 'buyer';
  end if;
  insert into public.profiles (id, email, role_id, full_name, phone, referral_code, hierarchy_path)
  values (
    new.id, new.email, v_role, v_name, v_phone,
    public.gen_referral_code(), text2ltree(public.uuid_label(new.id))
  );
  return new;
end $$;
