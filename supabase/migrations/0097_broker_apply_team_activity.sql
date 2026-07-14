-- 0097: role-perspective round (owner, 2026-07-14)
-- 1) BROKER becomes apply-first: no more instant self-switch. A user submits the
--    new dynamic "Broker Application" (license proof photo via the 'photo' field
--    type from 0096); the admin reviews it in Form submissions and approving it
--    assigns the Broker role (admin.html). Existing brokers keep their role.
-- 2) team_activity_feed(): recent subtree events (joins, commissions, bookings)
--    so Promoters/Sub-Promoters see what their team is DOING, not just totals.
--    Mirrors team_summary()'s hierarchy_path subtree guard.

update public.roles set self_selectable = false where slug = 'broker';

insert into public.form_definitions (key, name, fields, active)
select 'broker', 'Broker Application', '[
  {"name":"agency_name","type":"text","label":"Firm / agency name","required":true},
  {"name":"rera_number","type":"text","label":"RERA registration no. (if any)"},
  {"name":"experience_years","type":"number","label":"Years of experience","required":true},
  {"name":"operating_areas","type":"text","label":"Areas you operate in","required":true},
  {"name":"license_proof","type":"photo","label":"License / RERA / ID proof (photo)","required":true,"help":"A clear photo of your broker license, RERA certificate or business ID"},
  {"name":"note","type":"textarea","label":"Anything else (optional)"}
]'::jsonb, true
where not exists (select 1 from public.form_definitions where key = 'broker');

create or replace function public.team_activity_feed(p_limit int default 30)
returns table(kind text, who text, summary text, amount numeric, happened_at timestamptz)
language sql stable security definer set search_path = public as $$
  with me as (select hierarchy_path as hp from public.profiles where id = auth.uid()),
  team as (
    select p.id, p.full_name, p.created_at from public.profiles p, me
    where p.hierarchy_path <@ me.hp and p.id <> auth.uid()
  ),
  ev as (
    select 'join'::text as kind, t.full_name as who,
           coalesce(t.full_name, 'A new member') || ' joined your team' as summary,
           null::numeric as amount, t.created_at as happened_at
    from team t
    union all
    select 'commission', t.full_name,
           coalesce(t.full_name, 'A member') || ' earned a commission',
           l.amount, l.created_at
    from public.commission_ledger l join team t on t.id = l.user_id
    where l.direction = 'credit'
    union all
    select 'booking', t.full_name,
           coalesce(t.full_name, 'A member') || ' closed a booking'
             || coalesce(' · ' || pr.plot_code, ''),
           b.amount, b.created_at
    from public.bookings b
    join team t on t.id = b.agent_id
    left join public.properties pr on pr.id = b.property_id
  )
  select * from ev order by happened_at desc limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

grant execute on function public.team_activity_feed(int) to authenticated;
