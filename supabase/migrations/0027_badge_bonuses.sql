-- JAMIN Properties — 0027 bonus rewards (MOD15 Gamification — Bonus Rewards).
-- ADDITIVE ONLY. Badges gain a claimable cash bonus that posts to the append-only
-- commission ledger (so it flows into the derived wallet + withdrawals). Idempotent.

alter table public.badges      add column if not exists bonus numeric(18,2) not null default 0;
alter table public.user_badges add column if not exists bonus_claimed_at timestamptz;

-- Seed bonus amounts on the existing badges (INR). Additive data update; only sets
-- rows still at the default 0 so a hand-tuned value is never overwritten.
update public.badges set bonus = v.amt from (values
  ('first_sale', 1000), ('closer_10', 10000), ('earner_1l', 2500), ('earner_10l', 25000),
  ('team_5', 2000), ('team_25', 10000), ('referrer_3', 1500)
) as v(key, amt) where public.badges.key = v.key and public.badges.bonus = 0;

-- Claim a badge's bonus: must own the badge, bonus must exist, once only.
-- Posts a ledger credit (source_ref bonus:<badge>) → wallet trigger updates balance.
create or replace function public.claim_badge_bonus(p_badge uuid)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_ub    public.user_badges%rowtype;
  v_bonus numeric;
  v_role  uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select * into v_ub from public.user_badges
    where user_id = v_user and badge_id = p_badge for update;
  if not found then raise exception 'badge not earned'; end if;
  if v_ub.bonus_claimed_at is not null then raise exception 'bonus already claimed'; end if;

  select bonus into v_bonus from public.badges where id = p_badge;
  if coalesce(v_bonus, 0) <= 0 then raise exception 'no bonus for this badge'; end if;

  -- Double-guard: never post a second ledger row for the same badge bonus.
  if exists (select 1 from public.commission_ledger
               where user_id = v_user and source_ref = 'bonus:' || p_badge) then
    update public.user_badges set bonus_claimed_at = now() where id = v_ub.id;
    raise exception 'bonus already claimed';
  end if;

  select role_id into v_role from public.profiles where id = v_user;
  insert into public.commission_ledger(user_id, source_ref, role_id, amount, direction, status)
  values (v_user, 'bonus:' || p_badge, v_role, v_bonus, 'credit', 'posted');
  update public.user_badges set bonus_claimed_at = now() where id = v_ub.id;
  return v_bonus;
end $$;
grant execute on function public.claim_badge_bonus(uuid) to authenticated;
