-- JAMIN Properties — 0052 market insights + per-agent public pages.
-- Read-only analytics RPCs (market trends, investment hotspots, seasonal
-- leaderboard) + an anon-safe agent public-profile RPC for /a/<code> web pages
-- (NEVER returns phone/email — contact stays platform-mediated). All additive.

-- ── market trends: per-locality supply + pricing ────────────────────────────
create or replace function public.market_trends()
returns table (location text, listings bigint, avg_price numeric, available bigint, sold bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(pr.location), ''), '(unknown)') as location,
         count(*)::bigint,
         round(avg(p.price))::numeric,
         count(*) filter (where p.status = 'available')::bigint,
         count(*) filter (where p.status = 'sold')::bigint
  from public.properties p
  left join public.projects pr on pr.id = p.project_id
  where p.approval_status = 'approved'
  group by 1
  order by 2 desc
  limit 50;
$$;
revoke execute on function public.market_trends() from public, anon;
grant  execute on function public.market_trends() to authenticated;

-- ── investment hotspots: demand vs supply by locality ───────────────────────
create or replace function public.investment_hotspots()
returns table (location text, demand bigint, supply bigint, avg_price numeric, score numeric)
language sql stable security definer set search_path = public as $$
  with sup as (
    select coalesce(nullif(trim(pr.location), ''), '(unknown)') as loc,
           count(*) filter (where p.status = 'available')::bigint as supply,
           round(avg(p.price))::numeric as avg_price
    from public.properties p
    left join public.projects pr on pr.id = p.project_id
    where p.approval_status = 'approved'
    group by 1
  ),
  dem as (
    select coalesce(nullif(trim(location), ''), '(unknown)') as loc, count(*)::bigint as demand
    from public.buyer_requirements
    group by 1
  )
  select s.loc, coalesce(d.demand, 0)::bigint, s.supply, s.avg_price,
         round(coalesce(d.demand, 0)::numeric / (s.supply + 1), 2) as score
  from sup s
  left join dem d on d.loc = s.loc
  order by score desc, demand desc
  limit 50;
$$;
revoke execute on function public.investment_hotspots() from public, anon;
grant  execute on function public.investment_hotspots() to authenticated;

-- ── seasonal leaderboard: top earners in a date window ──────────────────────
create or replace function public.season_leaderboard(p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, full_name text, role_name text, earnings numeric, rank bigint)
language sql stable security definer set search_path = public as $$
  select cl.user_id, pr.full_name, r.name,
         sum(cl.amount)::numeric as earnings,
         rank() over (order by sum(cl.amount) desc) as rank
  from public.commission_ledger cl
  join public.profiles pr on pr.id = cl.user_id
  left join public.roles r on r.id = pr.role_id
  where cl.direction = 'credit' and cl.created_at >= p_from and cl.created_at < p_to
  group by cl.user_id, pr.full_name, r.name
  order by earnings desc
  limit 50;
$$;
revoke execute on function public.season_leaderboard(timestamptz, timestamptz) from public, anon;
grant  execute on function public.season_leaderboard(timestamptz, timestamptz) to authenticated;

-- ── per-agent public profile (anon) — no contact details ────────────────────
create or replace function public.agent_public_profile(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', pr.full_name,
    'photo', pr.photo_url,
    'designation', pr.designation,
    'referral_code', pr.referral_code,
    'listings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'plot_code', p.plot_code, 'price', p.price,
        'project', pj.name, 'location', pj.location
      ) order by p.created_at desc)
      from public.properties p
      left join public.projects pj on pj.id = p.project_id
      where p.seller_id = pr.id and p.status = 'available' and p.approval_status = 'approved'
    ), '[]'::jsonb)
  )
  from public.profiles pr
  where pr.referral_code = p_code
  limit 1;
$$;
grant execute on function public.agent_public_profile(text) to anon, authenticated;
