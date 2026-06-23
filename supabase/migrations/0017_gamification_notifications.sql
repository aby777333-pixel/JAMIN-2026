-- JAMIN Properties — 0017 gamification (§5.15) + notifications (§11) + analytics.
-- Badges auto-award on milestones; a leaderboard ranks the network; DB triggers
-- raise in-app notifications (delivered live via Realtime) on the key events.

-- ─── Badges ──────────────────────────────────────────────────────────────────
create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name        text not null,
  description text,
  icon        text default 'ribbon',          -- ionicons name
  tier        text not null default 'bronze',
  criteria    jsonb not null default '{}'::jsonb,  -- {type:earnings|sales|team|referrals, threshold:N}
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.user_badges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  badge_id   uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
create index idx_user_badges_user on public.user_badges(user_id);

insert into public.badges (key, name, description, icon, tier, criteria) values
  ('first_sale','First Sale','Closed your first deal','trophy','bronze','{"type":"sales","threshold":1}'),
  ('closer_10','Deal Closer','Closed 10 deals','trophy','gold','{"type":"sales","threshold":10}'),
  ('earner_1l','1 Lakh Club','Earned Rs 1,00,000 in commissions','cash','silver','{"type":"earnings","threshold":100000}'),
  ('earner_10l','10 Lakh Club','Earned Rs 10,00,000 in commissions','cash','gold','{"type":"earnings","threshold":1000000}'),
  ('team_5','Team Builder','Built a team of 5','people','bronze','{"type":"team","threshold":5}'),
  ('team_25','Network Leader','Built a network of 25','people','gold','{"type":"team","threshold":25}'),
  ('referrer_3','Connector','3 successful referrals','share-social','bronze','{"type":"referrals","threshold":3}');

-- ─── Notifications config ────────────────────────────────────────────────────
alter table public.profiles add column if not exists notification_prefs jsonb not null
  default '{"commission":true,"withdrawal":true,"kyc":true,"lead":true,"badge":true,"booking":true}'::jsonb;

create table public.push_tokens (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.push_tokens enable row level security;

create policy badges_read on public.badges for select to authenticated using (true);
create policy badges_admin on public.badges for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy user_badges_read on public.user_badges for select to authenticated using (true);
create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── Notify helper ───────────────────────────────────────────────────────────
create or replace function public.notify(
  p_user uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications(user_id, type, title, body, data)
  values (p_user, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb));
end $$;

-- ─── Badge evaluation (idempotent) ───────────────────────────────────────────
create or replace function public.evaluate_badges(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_path ltree; v_earn numeric; v_sales int; v_team int; v_refs int; r record;
begin
  select hierarchy_path into v_path from public.profiles where id = p_user;
  if v_path is null then return; end if;
  select coalesce(sum(amount),0) into v_earn from public.commission_ledger
    where user_id = p_user and direction = 'credit';
  select count(distinct source_ref) into v_sales from public.commission_ledger
    where user_id = p_user and source_ref like 'sale:%';
  select count(*) into v_team from public.profiles
    where hierarchy_path <@ v_path and id <> p_user;
  select count(*) into v_refs from public.referral_events
    where sharer_id = p_user and stage = 'assigned';

  for r in select * from public.badges where active loop
    if (r.criteria->>'type' = 'earnings'  and v_earn  >= (r.criteria->>'threshold')::numeric)
    or (r.criteria->>'type' = 'sales'     and v_sales >= (r.criteria->>'threshold')::int)
    or (r.criteria->>'type' = 'team'      and v_team  >= (r.criteria->>'threshold')::int)
    or (r.criteria->>'type' = 'referrals' and v_refs  >= (r.criteria->>'threshold')::int)
    then
      insert into public.user_badges(user_id, badge_id) values (p_user, r.id)
      on conflict (user_id, badge_id) do nothing;
    end if;
  end loop;
end $$;

-- ─── Leaderboard ─────────────────────────────────────────────────────────────
create or replace function public.get_leaderboard(p_metric text default 'earnings', p_limit int default 20)
returns table(user_id uuid, full_name text, role_name text, value numeric, rank int)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with base as (
    select p.id, p.full_name, r.name as role_name,
      case p_metric
        when 'earnings'  then coalesce((select sum(amount) from public.commission_ledger l where l.user_id = p.id and l.direction = 'credit'), 0)
        when 'sales'     then (select count(distinct source_ref) from public.commission_ledger l where l.user_id = p.id and l.source_ref like 'sale:%')::numeric
        when 'team'      then (select count(*) from public.profiles c where c.hierarchy_path <@ p.hierarchy_path and c.id <> p.id)::numeric
        when 'referrals' then (select count(*) from public.referral_events e where e.sharer_id = p.id and e.stage = 'assigned')::numeric
        else 0
      end as value
    from public.profiles p left join public.roles r on r.id = p.role_id
  )
  select b.id, b.full_name, b.role_name, b.value,
         row_number() over (order by b.value desc, b.full_name)::int as rank
  from base b
  where b.value > 0
  order by b.value desc, b.full_name
  limit p_limit;
end $$;

-- ─── Triggers ────────────────────────────────────────────────────────────────
-- commission credit -> notify + (re)evaluate badges
create or replace function public.on_ledger_gamify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'credit' then
    perform public.notify(new.user_id, 'commission', 'Commission credited',
      'You earned Rs ' || trim(to_char(new.amount, 'FM999999990.00')),
      jsonb_build_object('amount', new.amount, 'ref', new.source_ref));
    perform public.evaluate_badges(new.user_id);
  end if;
  return null;
end $$;
create trigger trg_ledger_gamify after insert on public.commission_ledger
  for each row execute function public.on_ledger_gamify();

-- badge awarded -> notify
create or replace function public.on_badge_awarded()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from public.badges where id = new.badge_id;
  perform public.notify(new.user_id, 'badge', 'Badge unlocked', v_name,
    jsonb_build_object('badge_id', new.badge_id));
  return null;
end $$;
create trigger trg_badge_awarded after insert on public.user_badges
  for each row execute function public.on_badge_awarded();

-- withdrawal status change -> notify
create or replace function public.on_withdrawal_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public.notify(new.user_id, 'withdrawal', 'Withdrawal ' || new.status,
      'Rs ' || trim(to_char(new.amount, 'FM999999990.00')) || ' - ' || new.status,
      jsonb_build_object('id', new.id, 'status', new.status));
  end if;
  return null;
end $$;
create trigger trg_withdrawal_notify after update of status on public.withdrawals
  for each row execute function public.on_withdrawal_notify();

-- KYC status change -> notify
create or replace function public.on_kyc_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kyc_status is distinct from old.kyc_status then
    perform public.notify(new.id, 'kyc', 'KYC ' || new.kyc_status,
      'Your verification is now ' || new.kyc_status, jsonb_build_object('status', new.kyc_status));
  end if;
  return null;
end $$;
create trigger trg_kyc_notify after update of kyc_status on public.profiles
  for each row execute function public.on_kyc_notify();

-- new lead -> notify owner
create or replace function public.on_lead_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.owner_id, 'lead', 'New lead',
    coalesce(new.contact->>'name', 'A new enquiry') || ' came in',
    jsonb_build_object('lead_id', new.id));
  return null;
end $$;
create trigger trg_lead_notify after insert on public.leads
  for each row execute function public.on_lead_notify();

-- ─── Grants / hardening ──────────────────────────────────────────────────────
revoke execute on function public.notify(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.evaluate_badges(uuid) from public, anon, authenticated;
revoke execute on function public.on_ledger_gamify() from public, anon, authenticated;
revoke execute on function public.on_badge_awarded() from public, anon, authenticated;
revoke execute on function public.on_withdrawal_notify() from public, anon, authenticated;
revoke execute on function public.on_kyc_notify() from public, anon, authenticated;
revoke execute on function public.on_lead_notify() from public, anon, authenticated;
grant execute on function public.get_leaderboard(text, int) to authenticated;

-- ─── Realtime ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.notifications;
