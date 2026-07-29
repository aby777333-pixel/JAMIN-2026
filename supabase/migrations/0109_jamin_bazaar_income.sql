-- 0109: Jamin Bazaar — Sales Income (DSI/RSI/ASI), Wallet views, Award/Rank progression, Launch Offers
-- Additive only. Money flows into the existing commission_ledger -> wallets spine when income is released,
-- so wallet math, withdrawals and the append-only ledger guard stay untouched.
-- DSI/RSI accrual rates default to 0 so no promoter is double-paid on top of the existing
-- commission_rules engine until the admin explicitly sets rates in Income Settings.

-- ───────────────────────── config ─────────────────────────
insert into public.system_config(key, value) values
  ('bazaar_income', jsonb_build_object(
     'dsi_percent', 0,
     'rsi_percent', 0,
     'min_direct_referrals', 3,
     'rsi_requires_direct_sale', true,
     'auto_approve', true
  ))
on conflict (key) do nothing;

create sequence if not exists public.bazaar_ref_seq;

-- ───────────────────────── award levels catalog ─────────────────────────
create table if not exists public.bazaar_award_levels (
  id uuid primary key default gen_random_uuid(),
  level int not null unique,
  designation text not null,
  per_referral_team_sales numeric(18,2) not null default 0,
  monthly_award numeric(18,2) not null default 0,
  validity_months int not null default 12,
  min_direct_referrals int not null default 3,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.bazaar_award_levels (level, designation, per_referral_team_sales, monthly_award, validity_months)
select * from (values
  (1, 'Business Development Manager',   5000000::numeric,  10000::numeric, 12),
  (2, 'Zonal Manager',                 10000000::numeric,  20000::numeric, 24),
  (3, 'Assistant General Manager',     20000000::numeric,  30000::numeric, 36),
  (4, 'General Manager',               40000000::numeric,  40000::numeric, 48),
  (5, 'Honour of Director',           100000000::numeric,  50000::numeric, 60)
) as v(level, designation, per_referral_team_sales, monthly_award, validity_months)
where not exists (select 1 from public.bazaar_award_levels);

-- ───────────────────────── income ledger ─────────────────────────
create table if not exists public.bazaar_income_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  income_type text not null check (income_type in ('dsi','rsi','asi','offer','adjustment')),
  amount numeric(18,2) not null check (amount > 0),
  description text,
  reference_no text not null default ('JB' || to_char(nextval('public.bazaar_ref_seq'), 'FM0000000')),
  source_ref text,
  status text not null default 'pending' check (status in ('locked','pending','approved','paid','rejected')),
  booking_id uuid references public.bookings(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  released_at timestamptz,
  created_by uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists bazaar_income_dedupe
  on public.bazaar_income_ledger (user_id, income_type, source_ref) where source_ref is not null;
create index if not exists bazaar_income_user_idx on public.bazaar_income_ledger (user_id, income_type, created_at desc);

-- release: the moment a row becomes 'approved' it is credited to the real wallet via commission_ledger
create or replace function public.bazaar_release_income()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status in ('approved','paid') and new.released_at is null then
    insert into public.commission_ledger (user_id, source_ref, amount, direction, status)
    values (new.user_id, 'bazaar:' || new.id, new.amount, 'credit', 'posted');
    new.released_at := now();
    perform public.notify(new.user_id, 'commission', 'Income credited ✓',
      'Your ' || upper(new.income_type) || ' income of ₹' || trim(to_char(new.amount, 'FM99999999990')) ||
      ' (' || new.reference_no || ') has been credited to your wallet.',
      jsonb_build_object('bazaar_income_id', new.id, 'income_type', new.income_type, 'amount', new.amount));
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_bazaar_release_income on public.bazaar_income_ledger;
create trigger trg_bazaar_release_income
  before insert or update on public.bazaar_income_ledger
  for each row execute function public.bazaar_release_income();

-- ───────────────────────── promoter status ─────────────────────────
create table if not exists public.bazaar_promoter_status (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  direct_sales_count int not null default 0,
  direct_referrals_count int not null default 0,
  team_sales numeric(18,2) not null default 0,
  min_referral_team_sales numeric(18,2) not null default 0,
  current_level int not null default 0,
  designation text,
  rsi_unlocked boolean not null default false,
  rsi_unlocked_at timestamptz,
  admin_override boolean not null default false,
  last_evaluated_at timestamptz,
  updated_at timestamptz not null default now()
);

-- one row per achieved award level (drives monthly ASI credits)
create table if not exists public.bazaar_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  level int not null,
  designation text not null,
  monthly_amount numeric(18,2) not null default 0,
  valid_from date not null default current_date,
  valid_until date not null,
  months_total int not null,
  months_credited int not null default 0,
  last_credited_month date,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(),
  unique (user_id, level)
);

-- ───────────────────────── launch offers ─────────────────────────
create table if not exists public.bazaar_launch_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  required_direct_sales int not null default 3,
  reward_type text not null default 'cashback'
    check (reward_type in ('cashback','shopping_voucher','domestic_tour','international_tour','gift','custom')),
  reward_label text,
  reward_amount numeric(18,2) not null default 0,
  banner_url text,
  terms text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bazaar_offer_awards (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.bazaar_launch_offers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  direct_sales_count int not null default 0,
  status text not null default 'achieved' check (status in ('achieved','reward_issued','cancelled')),
  achieved_at timestamptz not null default now(),
  issued_at timestamptz,
  note text,
  unique (offer_id, user_id)
);

-- ───────────────────────── helpers ─────────────────────────
create or replace function public.bazaar_cfg()
returns jsonb language sql stable set search_path to 'public' as $$
  select coalesce((select value from public.system_config where key = 'bazaar_income'), '{}'::jsonb);
$$;

create or replace function public.bazaar_notify_admins(p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_admin uuid;
begin
  for v_admin in
    select pr.id from public.profiles pr join public.roles r on r.id = pr.role_id where r.is_admin
  loop
    perform public.notify(v_admin, p_type, p_title, p_body, p_data);
  end loop;
end $$;

-- completed direct sales for a user (won bookings where they are the selling agent)
create or replace function public.bazaar_direct_sales_count(p_user uuid, p_from timestamptz default null, p_to timestamptz default null)
returns int language sql stable security definer set search_path to 'public' as $$
  select count(*)::int from public.bookings b
  where b.agent_id = p_user and b.status = 'won'
    and (p_from is null or b.created_at >= p_from)
    and (p_to   is null or b.created_at <= p_to);
$$;

-- team sales value for a subtree root (their own + all descendants' won sales, valued at property price)
create or replace function public.bazaar_team_sales(p_root uuid)
returns numeric language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(coalesce(p.price, b.amount, 0)), 0)::numeric
  from public.bookings b
  join public.properties p on p.id = b.property_id
  where b.status = 'won'
    and b.agent_id in (
      select pr.id from public.profiles pr
      where pr.hierarchy_path is not null
        and pr.hierarchy_path <@ (select hierarchy_path from public.profiles where id = p_root)
    );
$$;

-- ───────────────────────── core evaluation ─────────────────────────
create or replace function public.bazaar_evaluate(p_user uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_cfg jsonb := public.bazaar_cfg();
  v_auto boolean := coalesce((public.bazaar_cfg()->>'auto_approve')::boolean, true);
  v_direct int;
  v_refs int;
  v_team numeric;
  v_min_team numeric;
  v_status public.bazaar_promoter_status%rowtype;
  v_lvl record;
  v_new_level int;
  v_new_desig text;
  v_name text;
  v_r record;
  v_offer record;
  v_cnt int;
begin
  if p_user is null then return; end if;

  v_direct := public.bazaar_direct_sales_count(p_user);
  select count(*)::int into v_refs
    from public.profiles pr join public.roles r on r.id = pr.role_id
   where pr.parent_id = p_user and r.slug <> 'buyer';
  v_team := public.bazaar_team_sales(p_user);

  -- weakest direct-referral team decides level progression ("each referral's team must achieve X")
  select coalesce(min(public.bazaar_team_sales(pr.id)), 0) into v_min_team
    from public.profiles pr join public.roles r on r.id = pr.role_id
   where pr.parent_id = p_user and r.slug <> 'buyer';

  insert into public.bazaar_promoter_status as s (user_id) values (p_user)
  on conflict (user_id) do nothing;
  select * into v_status from public.bazaar_promoter_status where user_id = p_user for update;

  -- 1) RSI eligibility: first direct sale unlocks all locked referral income
  if v_direct >= 1 and not v_status.rsi_unlocked then
    update public.bazaar_promoter_status
       set rsi_unlocked = true, rsi_unlocked_at = now(), updated_at = now()
     where user_id = p_user;
    update public.bazaar_income_ledger
       set status = case when v_auto then 'approved' else 'pending' end,
           description = coalesce(description, '') || ' (unlocked after first direct sale)'
     where user_id = p_user and income_type = 'rsi' and status = 'locked';
    perform public.notify(p_user, 'commission', 'Referral income unlocked 🎉',
      'Congratulations! Your first direct sale is complete — your referral sales income is now unlocked.',
      jsonb_build_object('event', 'rsi_unlocked'));
  end if;

  -- 2) award level progression (skipped when admin has pinned a designation)
  if not v_status.admin_override then
    v_new_level := v_status.current_level;
    v_new_desig := v_status.designation;
    for v_lvl in
      select * from public.bazaar_award_levels
      where active and level > v_status.current_level
      order by level
    loop
      if v_refs >= v_lvl.min_direct_referrals and v_min_team >= v_lvl.per_referral_team_sales then
        v_new_level := v_lvl.level;
        v_new_desig := v_lvl.designation;
      else
        exit;
      end if;
    end loop;

    if v_new_level > v_status.current_level then
      update public.bazaar_promoter_status
         set current_level = v_new_level, designation = v_new_desig, updated_at = now()
       where user_id = p_user;
      update public.profiles set designation = v_new_desig, updated_at = now() where id = p_user;

      for v_lvl in
        select * from public.bazaar_award_levels
        where active and level > v_status.current_level and level <= v_new_level
        order by level
      loop
        insert into public.bazaar_awards (user_id, level, designation, monthly_amount,
                                          valid_from, valid_until, months_total)
        values (p_user, v_lvl.level, v_lvl.designation, v_lvl.monthly_award,
                current_date, (current_date + make_interval(months => v_lvl.validity_months))::date,
                v_lvl.validity_months)
        on conflict (user_id, level) do nothing;
      end loop;

      select coalesce(full_name, email, 'Promoter') into v_name from public.profiles where id = p_user;
      perform public.notify(p_user, 'badge', 'Rank upgraded: ' || v_new_desig || ' 🏆',
        'Your team performance has earned you the designation of ' || v_new_desig ||
        ' (Level ' || v_new_level || '). Monthly award income has been activated.',
        jsonb_build_object('event', 'level_up', 'level', v_new_level, 'designation', v_new_desig));
      perform public.bazaar_notify_admins('badge', 'Promoter rank upgrade',
        v_name || ' has reached Level ' || v_new_level || ' — ' || v_new_desig || '.',
        jsonb_build_object('user_id', p_user, 'level', v_new_level));
      begin
        insert into public.email_outbox (to_email, subject, kind)
        select email, 'Jamin Bazaar: You are now ' || v_new_desig || ' (Level ' || v_new_level || ')', 'bazaar'
          from public.profiles where id = p_user and email is not null;
      exception when others then null;
      end;
    end if;
  end if;

  -- 3) launch offers
  for v_offer in
    select * from public.bazaar_launch_offers
    where active and now() between starts_at and ends_at
  loop
    v_cnt := public.bazaar_direct_sales_count(p_user, v_offer.starts_at, v_offer.ends_at);
    if v_cnt >= v_offer.required_direct_sales
       and not exists (select 1 from public.bazaar_offer_awards where offer_id = v_offer.id and user_id = p_user) then
      insert into public.bazaar_offer_awards (offer_id, user_id, direct_sales_count)
      values (v_offer.id, p_user, v_cnt);
      if v_offer.reward_amount > 0 then
        insert into public.bazaar_income_ledger (user_id, income_type, amount, description, source_ref, status)
        values (p_user, 'offer', v_offer.reward_amount,
                'Launch offer reward: ' || v_offer.title,
                'offer:' || v_offer.id,
                case when v_auto then 'approved' else 'pending' end)
        on conflict do nothing;
      end if;
      perform public.notify(p_user, 'badge', 'Launch offer achieved 🎁',
        'You completed ' || v_cnt || ' direct sales and earned: ' ||
        coalesce(v_offer.reward_label, v_offer.reward_type) || ' (' || v_offer.title || ').',
        jsonb_build_object('event', 'launch_offer', 'offer_id', v_offer.id));
      perform public.bazaar_notify_admins('badge', 'Launch offer reward due',
        'A promoter qualified for launch offer "' || v_offer.title || '" — review reward distribution.',
        jsonb_build_object('user_id', p_user, 'offer_id', v_offer.id));
    end if;
  end loop;

  update public.bazaar_promoter_status
     set direct_sales_count = v_direct,
         direct_referrals_count = v_refs,
         team_sales = v_team,
         min_referral_team_sales = v_min_team,
         last_evaluated_at = now(),
         updated_at = now()
   where user_id = p_user;
end $$;

-- ───────────────────────── sale hook ─────────────────────────
-- Fires whenever a booking is marked won (close_sale or any admin path). Never allowed to
-- break the sale transaction: everything is wrapped in an exception guard.
create or replace function public.bazaar_process_sale()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_cfg jsonb;
  v_dsi numeric;
  v_rsi numeric;
  v_auto boolean;
  v_price numeric;
  v_agent_path public.profiles.hierarchy_path%type;
  v_anc record;
  v_amt numeric;
  v_unlocked boolean;
begin
  if new.status <> 'won' or coalesce(old.status, '') = 'won' or new.agent_id is null then
    return new;
  end if;
  begin
    v_cfg  := public.bazaar_cfg();
    v_dsi  := coalesce((v_cfg->>'dsi_percent')::numeric, 0);
    v_rsi  := coalesce((v_cfg->>'rsi_percent')::numeric, 0);
    v_auto := coalesce((v_cfg->>'auto_approve')::boolean, true);

    select coalesce(p.price, new.amount, 0) into v_price
      from public.properties p where p.id = new.property_id;
    v_price := coalesce(v_price, new.amount, 0);

    -- Direct Sales Income for the selling promoter
    if v_dsi > 0 and v_price > 0 then
      v_amt := round(v_price * v_dsi / 100, 2);
      if v_amt > 0 then
        insert into public.bazaar_income_ledger (user_id, income_type, amount, description, source_ref,
                                                 status, booking_id, property_id)
        values (new.agent_id, 'dsi', v_amt,
                'Direct sale income (' || v_dsi || '% of ₹' || trim(to_char(v_price, 'FM99999999990')) || ')',
                'dsi:booking:' || new.id,
                case when v_auto then 'approved' else 'pending' end,
                new.id, new.property_id)
        on conflict do nothing;
      end if;
    end if;

    -- Referral Sales Income up the chain (locked until each ancestor has a direct sale)
    if v_rsi > 0 and v_price > 0 then
      select hierarchy_path into v_agent_path from public.profiles where id = new.agent_id;
      if v_agent_path is not null then
        v_amt := round(v_price * v_rsi / 100, 2);
        if v_amt > 0 then
          for v_anc in
            select pr.id from public.profiles pr
            where pr.hierarchy_path @> v_agent_path and pr.id <> new.agent_id
          loop
            v_unlocked := (not coalesce((v_cfg->>'rsi_requires_direct_sale')::boolean, true))
                          or public.bazaar_direct_sales_count(v_anc.id) >= 1;
            insert into public.bazaar_income_ledger (user_id, income_type, amount, description, source_ref,
                                                     status, booking_id, property_id)
            values (v_anc.id, 'rsi', v_amt,
                    'Referral sale income (' || v_rsi || '% of ₹' || trim(to_char(v_price, 'FM99999999990')) || ')',
                    'rsi:booking:' || new.id,
                    case when not v_unlocked then 'locked'
                         when v_auto then 'approved' else 'pending' end,
                    new.id, new.property_id)
            on conflict do nothing;
          end loop;
        end if;
      end if;
    end if;

    -- Re-evaluate the seller and every upline (their team sales just grew)
    perform public.bazaar_evaluate(new.agent_id);
    select hierarchy_path into v_agent_path from public.profiles where id = new.agent_id;
    if v_agent_path is not null then
      for v_anc in
        select pr.id from public.profiles pr
        where pr.hierarchy_path @> v_agent_path and pr.id <> new.agent_id
      loop
        perform public.bazaar_evaluate(v_anc.id);
      end loop;
    end if;
  exception when others then
    raise warning 'bazaar_process_sale skipped: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists trg_bazaar_process_sale on public.bookings;
create trigger trg_bazaar_process_sale
  after update on public.bookings
  for each row execute function public.bazaar_process_sale();

-- ───────────────────────── monthly ASI credits ─────────────────────────
create or replace function public.bazaar_credit_monthly_awards()
returns int language plpgsql security definer set search_path to 'public' as $$
declare
  v_a record;
  v_month date := date_trunc('month', now())::date;
  v_n int := 0;
begin
  for v_a in
    select * from public.bazaar_awards
    where status = 'active'
    order by created_at
  loop
    if v_a.months_credited >= v_a.months_total or v_month > v_a.valid_until then
      update public.bazaar_awards set status = 'completed' where id = v_a.id;
      continue;
    end if;
    if v_a.valid_from > current_date then continue; end if;
    if v_a.last_credited_month is not null and v_a.last_credited_month >= v_month then continue; end if;

    insert into public.bazaar_income_ledger (user_id, income_type, amount, description, source_ref, status)
    values (v_a.user_id, 'asi', v_a.monthly_amount,
            'Monthly award — ' || v_a.designation || ' (Level ' || v_a.level || ', ' ||
            to_char(v_month, 'Mon YYYY') || ')',
            'asi:' || v_a.id || ':' || to_char(v_month, 'YYYYMM'),
            'approved')
    on conflict do nothing;

    update public.bazaar_awards
       set months_credited = months_credited + 1, last_credited_month = v_month
     where id = v_a.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ───────────────────────── promoter-facing RPCs ─────────────────────────
create or replace function public.bazaar_income_summary()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  me uuid := auth.uid();
  v jsonb;
begin
  if me is null then raise exception 'not authenticated'; end if;

  with bz as (
    select income_type,
           sum(amount) filter (where status in ('approved','paid'))            as available,
           sum(amount) filter (where status = 'pending')                        as pending,
           sum(amount) filter (where status = 'locked')                         as locked,
           sum(amount) filter (where status in ('approved','paid','pending','locked')) as total
    from public.bazaar_income_ledger where user_id = me group by income_type
  ),
  legacy as (
    select
      coalesce(sum(cl.amount) filter (where b.agent_id = me), 0)  as dsi_legacy,
      coalesce(sum(cl.amount) filter (where b.agent_id is distinct from me), 0) as rsi_legacy
    from public.commission_ledger cl
    left join lateral (
      select bk.agent_id from public.bookings bk
      where bk.status = 'won' and 'sale:' || bk.property_id = cl.source_ref
      order by bk.created_at desc limit 1
    ) b on true
    where cl.user_id = me and cl.direction = 'credit' and cl.source_ref like 'sale:%'
  ),
  wd as (
    select coalesce(sum(amount) filter (where status = 'paid'), 0)        as withdrawn,
           coalesce(sum(amount) filter (where status in ('requested','approved')), 0) as pending_wd
    from public.withdrawals where user_id = me
  )
  select jsonb_build_object(
    'dsi', jsonb_build_object(
       'total',     coalesce((select total from bz where income_type='dsi'),0) + (select dsi_legacy from legacy),
       'available', coalesce((select available from bz where income_type='dsi'),0) + (select dsi_legacy from legacy),
       'pending',   coalesce((select pending from bz where income_type='dsi'),0),
       'locked',    coalesce((select locked from bz where income_type='dsi'),0)),
    'rsi', jsonb_build_object(
       'total',     coalesce((select total from bz where income_type='rsi'),0) + (select rsi_legacy from legacy),
       'available', coalesce((select available from bz where income_type='rsi'),0) + (select rsi_legacy from legacy),
       'pending',   coalesce((select pending from bz where income_type='rsi'),0),
       'locked',    coalesce((select locked from bz where income_type='rsi'),0)),
    'asi', jsonb_build_object(
       'total',     coalesce((select total from bz where income_type='asi'),0),
       'available', coalesce((select available from bz where income_type='asi'),0),
       'pending',   coalesce((select pending from bz where income_type='asi'),0),
       'locked',    coalesce((select locked from bz where income_type='asi'),0)),
    'other', jsonb_build_object(
       'total',     coalesce((select sum(total) from bz where income_type in ('offer','adjustment')),0),
       'available', coalesce((select sum(available) from bz where income_type in ('offer','adjustment')),0),
       'pending',   coalesce((select sum(pending) from bz where income_type in ('offer','adjustment')),0)),
    'wallet_balance', coalesce((select balance from public.wallets where user_id = me), 0),
    'withdrawn', (select withdrawn from wd),
    'pending_withdrawals', (select pending_wd from wd),
    'status', (select to_jsonb(s) from public.bazaar_promoter_status s where s.user_id = me),
    'next_level', (
       select to_jsonb(l) from public.bazaar_award_levels l
       where l.active and l.level > coalesce((select current_level from public.bazaar_promoter_status where user_id = me), 0)
       order by l.level limit 1),
    'referral_progress', coalesce((
       select jsonb_agg(jsonb_build_object(
         'id', pr.id, 'name', coalesce(pr.full_name, pr.email, 'Member'),
         'team_sales', public.bazaar_team_sales(pr.id)) order by pr.created_at)
       from public.profiles pr join public.roles r on r.id = pr.role_id
       where pr.parent_id = me and r.slug <> 'buyer'), '[]'::jsonb),
    'awards', coalesce((
       select jsonb_agg(to_jsonb(a) order by a.level)
       from public.bazaar_awards a where a.user_id = me), '[]'::jsonb),
    'offers', coalesce((
       select jsonb_agg(jsonb_build_object(
         'id', o.id, 'title', o.title, 'description', o.description,
         'required_direct_sales', o.required_direct_sales,
         'reward_type', o.reward_type, 'reward_label', o.reward_label,
         'reward_amount', o.reward_amount, 'banner_url', o.banner_url,
         'starts_at', o.starts_at, 'ends_at', o.ends_at, 'terms', o.terms,
         'my_sales', public.bazaar_direct_sales_count(me, o.starts_at, o.ends_at),
         'achieved', exists (select 1 from public.bazaar_offer_awards oa
                             where oa.offer_id = o.id and oa.user_id = me)) order by o.ends_at)
       from public.bazaar_launch_offers o
       where o.active and now() between o.starts_at and o.ends_at), '[]'::jsonb)
  ) into v;
  return v;
end $$;

create or replace function public.bazaar_income_history(
  p_type text default null, p_from date default null, p_to date default null)
returns table (
  entry_date timestamptz, income_type text, description text,
  reference_no text, amount numeric, status text
) language sql stable security definer set search_path to 'public' as $$
  select l.created_at, l.income_type,
         coalesce(l.description, initcap(l.income_type) || ' income'),
         l.reference_no, l.amount, l.status
    from public.bazaar_income_ledger l
   where l.user_id = auth.uid()
     and (p_type is null or l.income_type = p_type)
     and (p_from is null or l.created_at >= p_from)
     and (p_to   is null or l.created_at < p_to + 1)
  union all
  select cl.created_at,
         case when b.agent_id = auth.uid() then 'dsi' else 'rsi' end,
         case when b.agent_id = auth.uid() then 'Direct sale commission' else 'Team override commission' end,
         'CL-' || left(cl.id::text, 8), cl.amount, 'approved'
    from public.commission_ledger cl
    left join lateral (
      select bk.agent_id from public.bookings bk
      where bk.status = 'won' and 'sale:' || bk.property_id = cl.source_ref
      order by bk.created_at desc limit 1
    ) b on true
   where cl.user_id = auth.uid() and cl.direction = 'credit' and cl.source_ref like 'sale:%'
     and (p_type is null or p_type = case when b.agent_id = auth.uid() then 'dsi' else 'rsi' end)
     and (p_from is null or cl.created_at >= p_from)
     and (p_to   is null or cl.created_at < p_to + 1)
  order by 1 desc
  limit 500;
$$;

-- ───────────────────────── admin RPCs ─────────────────────────
create or replace function public.bazaar_admin_adjust(
  p_user uuid, p_amount numeric, p_description text,
  p_direction text default 'credit', p_type text default 'adjustment')
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  if not public.auth_is_admin() then raise exception 'admin only'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  if p_direction = 'credit' then
    insert into public.bazaar_income_ledger (user_id, income_type, amount, description, status, created_by)
    values (p_user, coalesce(p_type, 'adjustment'), p_amount,
            coalesce(p_description, 'Manual adjustment'), 'approved', auth.uid())
    returning id into v_id;
  elsif p_direction = 'debit' then
    insert into public.commission_ledger (user_id, source_ref, amount, direction, status)
    values (p_user, 'bazaar-adjust:' || gen_random_uuid(), p_amount, 'debit', 'posted');
    perform public.notify(p_user, 'commission', 'Wallet adjustment',
      'An adjustment of ₹' || trim(to_char(p_amount, 'FM99999999990')) || ' was debited from your wallet. ' ||
      coalesce(p_description, ''), jsonb_build_object('direction', 'debit', 'amount', p_amount));
  else
    raise exception 'direction must be credit or debit';
  end if;
  perform public.log_admin_action('bazaar.adjust', 'bazaar_income_ledger', v_id,
    jsonb_build_object('user_id', p_user, 'amount', p_amount, 'direction', p_direction, 'note', p_description));
  return v_id;
end $$;

create or replace function public.bazaar_admin_set_designation(
  p_user uuid, p_level int, p_override boolean default true)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_lvl record;
begin
  if not public.auth_is_admin() then raise exception 'admin only'; end if;
  if p_level = 0 then
    insert into public.bazaar_promoter_status as s (user_id, current_level, designation, admin_override)
    values (p_user, 0, null, p_override)
    on conflict (user_id) do update
      set current_level = 0, designation = null, admin_override = p_override, updated_at = now();
    update public.profiles set designation = null, updated_at = now() where id = p_user;
  else
    select * into v_lvl from public.bazaar_award_levels where level = p_level;
    if not found then raise exception 'unknown level %', p_level; end if;
    insert into public.bazaar_promoter_status as s (user_id, current_level, designation, admin_override)
    values (p_user, v_lvl.level, v_lvl.designation, p_override)
    on conflict (user_id) do update
      set current_level = v_lvl.level, designation = v_lvl.designation,
          admin_override = p_override, updated_at = now();
    update public.profiles set designation = v_lvl.designation, updated_at = now() where id = p_user;
    perform public.notify(p_user, 'badge', 'Designation updated: ' || v_lvl.designation,
      'Your designation has been set to ' || v_lvl.designation || ' (Level ' || v_lvl.level || ').',
      jsonb_build_object('event', 'designation_set', 'level', v_lvl.level));
  end if;
  perform public.log_admin_action('bazaar.set_designation', 'bazaar_promoter_status', p_user,
    jsonb_build_object('level', p_level, 'override', p_override));
end $$;

create or replace function public.bazaar_admin_overview()
returns table (
  user_id uuid, full_name text, email text, phone text, role_slug text,
  direct_sales_count int, direct_referrals_count int, team_sales numeric,
  min_referral_team_sales numeric, current_level int, designation text,
  rsi_unlocked boolean, admin_override boolean,
  total_income numeric, locked_income numeric, wallet_balance numeric
) language sql stable security definer set search_path to 'public' as $$
  select pr.id, pr.full_name, pr.email, pr.phone, r.slug,
         coalesce(s.direct_sales_count, 0), coalesce(s.direct_referrals_count, 0),
         coalesce(s.team_sales, 0), coalesce(s.min_referral_team_sales, 0),
         coalesce(s.current_level, 0), coalesce(s.designation, pr.designation),
         coalesce(s.rsi_unlocked, false), coalesce(s.admin_override, false),
         coalesce((select sum(amount) from public.bazaar_income_ledger l
                   where l.user_id = pr.id and l.status in ('approved','paid','pending','locked')), 0),
         coalesce((select sum(amount) from public.bazaar_income_ledger l
                   where l.user_id = pr.id and l.status = 'locked'), 0),
         coalesce((select balance from public.wallets w where w.user_id = pr.id), 0)
    from public.profiles pr
    join public.roles r on r.id = pr.role_id
    left join public.bazaar_promoter_status s on s.user_id = pr.id
   where public.auth_is_admin()
     and r.slug in ('state_head','regional_manager','promoter','sub_promoter','agent','broker')
   order by coalesce(s.team_sales, 0) desc, pr.created_at;
$$;

create or replace function public.bazaar_admin_evaluate_all()
returns int language plpgsql security definer set search_path to 'public' as $$
declare v_u record; v_n int := 0;
begin
  if not public.auth_is_admin() then raise exception 'admin only'; end if;
  for v_u in
    select pr.id from public.profiles pr join public.roles r on r.id = pr.role_id
    where r.slug in ('state_head','regional_manager','promoter','sub_promoter','agent','broker')
  loop
    perform public.bazaar_evaluate(v_u.id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.bazaar_admin_set_income_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.auth_is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('pending','approved','paid','rejected') then raise exception 'bad status'; end if;
  update public.bazaar_income_ledger set status = p_status where id = p_id
    and (p_status <> 'rejected' or released_at is null); -- cannot reject already-credited income
  if not found then raise exception 'row not found or already credited'; end if;
  perform public.log_admin_action('bazaar.income_status', 'bazaar_income_ledger', p_id,
    jsonb_build_object('status', p_status));
end $$;

create or replace function public.bazaar_admin_issue_offer_reward(p_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_row record;
begin
  if not public.auth_is_admin() then raise exception 'admin only'; end if;
  select oa.*, o.title into v_row
    from public.bazaar_offer_awards oa join public.bazaar_launch_offers o on o.id = oa.offer_id
   where oa.id = p_id;
  if not found then raise exception 'not found'; end if;
  update public.bazaar_offer_awards
     set status = 'reward_issued', issued_at = now(), note = coalesce(p_note, note)
   where id = p_id;
  perform public.notify(v_row.user_id, 'badge', 'Launch offer reward issued 🎁',
    'Your reward for "' || v_row.title || '" has been issued.' ||
    case when p_note is not null then ' ' || p_note else '' end,
    jsonb_build_object('offer_award_id', p_id));
end $$;

-- ───────────────────────── RLS ─────────────────────────
alter table public.bazaar_award_levels enable row level security;
alter table public.bazaar_income_ledger enable row level security;
alter table public.bazaar_promoter_status enable row level security;
alter table public.bazaar_awards enable row level security;
alter table public.bazaar_launch_offers enable row level security;
alter table public.bazaar_offer_awards enable row level security;

drop policy if exists bazaar_levels_read on public.bazaar_award_levels;
create policy bazaar_levels_read on public.bazaar_award_levels
  for select to authenticated using (true);
drop policy if exists bazaar_levels_admin on public.bazaar_award_levels;
create policy bazaar_levels_admin on public.bazaar_award_levels
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

drop policy if exists bazaar_income_own on public.bazaar_income_ledger;
create policy bazaar_income_own on public.bazaar_income_ledger
  for select to authenticated using (user_id = auth.uid() or public.auth_is_admin());

drop policy if exists bazaar_status_own on public.bazaar_promoter_status;
create policy bazaar_status_own on public.bazaar_promoter_status
  for select to authenticated using (user_id = auth.uid() or public.auth_is_admin());

drop policy if exists bazaar_awards_own on public.bazaar_awards;
create policy bazaar_awards_own on public.bazaar_awards
  for select to authenticated using (user_id = auth.uid() or public.auth_is_admin());
drop policy if exists bazaar_awards_admin on public.bazaar_awards;
create policy bazaar_awards_admin on public.bazaar_awards
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

drop policy if exists bazaar_offers_read on public.bazaar_launch_offers;
create policy bazaar_offers_read on public.bazaar_launch_offers
  for select to authenticated using (active or public.auth_is_admin());
drop policy if exists bazaar_offers_admin on public.bazaar_launch_offers;
create policy bazaar_offers_admin on public.bazaar_launch_offers
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

drop policy if exists bazaar_offer_awards_own on public.bazaar_offer_awards;
create policy bazaar_offer_awards_own on public.bazaar_offer_awards
  for select to authenticated using (user_id = auth.uid() or public.auth_is_admin());
drop policy if exists bazaar_offer_awards_admin on public.bazaar_offer_awards;
create policy bazaar_offer_awards_admin on public.bazaar_offer_awards
  for update to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

-- ───────────────────────── grants (2026-10-30 flip safe) ─────────────────────────
grant select on public.bazaar_award_levels, public.bazaar_income_ledger,
               public.bazaar_promoter_status, public.bazaar_awards,
               public.bazaar_launch_offers, public.bazaar_offer_awards to authenticated;
grant insert, update, delete on public.bazaar_award_levels, public.bazaar_launch_offers to authenticated;
grant update on public.bazaar_offer_awards to authenticated;
grant insert, update, delete on public.bazaar_awards to authenticated;
grant usage on sequence public.bazaar_ref_seq to authenticated;

revoke all on public.bazaar_award_levels, public.bazaar_income_ledger,
           public.bazaar_promoter_status, public.bazaar_awards,
           public.bazaar_launch_offers, public.bazaar_offer_awards from anon;

revoke execute on function public.bazaar_income_summary() from public, anon;
revoke execute on function public.bazaar_income_history(text, date, date) from public, anon;
revoke execute on function public.bazaar_admin_adjust(uuid, numeric, text, text, text) from public, anon;
revoke execute on function public.bazaar_admin_set_designation(uuid, int, boolean) from public, anon;
revoke execute on function public.bazaar_admin_overview() from public, anon;
revoke execute on function public.bazaar_admin_evaluate_all() from public, anon;
revoke execute on function public.bazaar_admin_set_income_status(uuid, text) from public, anon;
revoke execute on function public.bazaar_admin_issue_offer_reward(uuid, text) from public, anon;
revoke execute on function public.bazaar_evaluate(uuid) from public, anon, authenticated;
revoke execute on function public.bazaar_credit_monthly_awards() from public, anon, authenticated;
revoke execute on function public.bazaar_notify_admins(text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.bazaar_income_summary() to authenticated;
grant execute on function public.bazaar_income_history(text, date, date) to authenticated;
grant execute on function public.bazaar_admin_adjust(uuid, numeric, text, text, text) to authenticated;
grant execute on function public.bazaar_admin_set_designation(uuid, int, boolean) to authenticated;
grant execute on function public.bazaar_admin_overview() to authenticated;
grant execute on function public.bazaar_admin_evaluate_all() to authenticated;
grant execute on function public.bazaar_admin_set_income_status(uuid, text) to authenticated;
grant execute on function public.bazaar_admin_issue_offer_reward(uuid, text) to authenticated;

-- ───────────────────────── realtime + cron ─────────────────────────
do $$
begin
  begin
    alter publication supabase_realtime add table public.bazaar_income_ledger;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.bazaar_offer_awards;
  exception when duplicate_object then null;
  end;
end $$;

select cron.schedule('jamin-bazaar-awards', '0 4 1 * *', 'select public.bazaar_credit_monthly_awards()');

-- ───────────────────────── branding + feature registry ─────────────────────────
update public.system_config
   set value = jsonb_set(value, '{name}', '"Jamin Bazaar"'), updated_at = now()
 where key = 'brand';

insert into public.app_features (key, name, description, enabled)
values ('bazaar_income', 'Jamin Bazaar Sales Income', 'DSI/RSI/ASI income, awards & launch offers', true)
on conflict (key) do nothing;
