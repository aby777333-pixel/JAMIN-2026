-- JAMIN Properties — 0061 escrow milestones + drip sequences + reels.
-- Built to work WITHOUT external services: escrow is a manual fund/release ledger
-- (gateway auto-charge later), drips create follow-up tasks + agent notifications
-- (SMS/WhatsApp channel later), reels store video in user-media. All additive.

-- ════════════════ ESCROW / TOKEN MILESTONES ════════════════════════════════
create table if not exists public.escrow_milestones (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  title       text not null,
  amount      numeric(18,2) not null default 0,
  status      text not null default 'pending' check (status in ('pending','funded','released','refunded')),
  due_date    date,
  funded_at   timestamptz,
  released_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_escrow_booking on public.escrow_milestones(booking_id);
drop trigger if exists trg_escrow_updated on public.escrow_milestones;
create trigger trg_escrow_updated before update on public.escrow_milestones
  for each row execute function public.set_updated_at();

alter table public.escrow_milestones enable row level security;
-- Visible to the booking's buyer/agent or an admin. Writes go through RPCs.
drop policy if exists escrow_select on public.escrow_milestones;
create policy escrow_select on public.escrow_milestones for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = escrow_milestones.booking_id
                 and (b.buyer_id = auth.uid() or b.agent_id = auth.uid() or public.auth_is_admin())));
grant select on public.escrow_milestones to authenticated;

create or replace function public.add_escrow_milestone(p_booking uuid, p_title text, p_amount numeric, p_due date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_agent uuid; v_id uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select agent_id into v_agent from public.bookings where id = p_booking;
  if not (public.auth_is_admin() or v_agent = v_self) then raise exception 'not authorized'; end if;
  insert into public.escrow_milestones(booking_id, title, amount, due_date)
  values (p_booking, p_title, coalesce(p_amount, 0), p_due) returning id into v_id;
  perform public.app_audit('escrow.added', 'escrow', v_id, jsonb_build_object('booking', p_booking, 'amount', p_amount));
  return v_id;
end $$;
revoke execute on function public.add_escrow_milestone(uuid, text, numeric, date) from public, anon;
grant  execute on function public.add_escrow_milestone(uuid, text, numeric, date) to authenticated;

create or replace function public.set_escrow_status(p_milestone uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_booking uuid; v_agent uuid; v_buyer uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  if p_status not in ('pending','funded','released','refunded') then raise exception 'bad status'; end if;
  select m.booking_id into v_booking from public.escrow_milestones m where m.id = p_milestone;
  if v_booking is null then raise exception 'milestone not found'; end if;
  select agent_id, buyer_id into v_agent, v_buyer from public.bookings where id = v_booking;
  if not (public.auth_is_admin() or v_agent = v_self) then raise exception 'not authorized'; end if;
  update public.escrow_milestones
    set status = p_status,
        funded_at   = case when p_status = 'funded'   then now() else funded_at end,
        released_at = case when p_status = 'released' then now() else released_at end
    where id = p_milestone;
  if v_buyer is not null then
    insert into public.notifications(user_id, type, title, body, data)
    values (v_buyer, 'escrow', 'Escrow ' || p_status, 'A payment milestone was ' || p_status || '.',
            jsonb_build_object('milestone_id', p_milestone, 'booking_id', v_booking, 'status', p_status));
  end if;
  perform public.app_audit('escrow.' || p_status, 'escrow', p_milestone, '{}'::jsonb);
end $$;
revoke execute on function public.set_escrow_status(uuid, text) from public, anon;
grant  execute on function public.set_escrow_status(uuid, text) to authenticated;

-- ════════════════ DRIP SEQUENCES ═══════════════════════════════════════════
create table if not exists public.drip_sequences (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  steps      jsonb not null default '[]'::jsonb,  -- [{ offset_days int, title text, body text }]
  created_at timestamptz not null default now()
);
create table if not exists public.drip_enrollments (
  id            uuid primary key default gen_random_uuid(),
  sequence_id   uuid not null references public.drip_sequences(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  owner_id      uuid,
  current_index int not null default 0,
  next_due_at   timestamptz,
  status        text not null default 'active' check (status in ('active','done','stopped')),
  created_at    timestamptz not null default now(),
  unique (sequence_id, lead_id)
);
create index if not exists idx_drip_enroll_due on public.drip_enrollments(next_due_at) where status = 'active';

alter table public.drip_sequences   enable row level security;
alter table public.drip_enrollments enable row level security;
drop policy if exists drip_seq_read on public.drip_sequences;
create policy drip_seq_read on public.drip_sequences for select to authenticated using (true);
drop policy if exists drip_seq_admin on public.drip_sequences;
create policy drip_seq_admin on public.drip_sequences for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
drop policy if exists drip_enroll_own on public.drip_enrollments;
create policy drip_enroll_own on public.drip_enrollments for select to authenticated
  using (owner_id = auth.uid() or public.auth_is_admin());
grant select on public.drip_sequences, public.drip_enrollments to authenticated;
grant insert, update, delete on public.drip_sequences to authenticated;

-- Enroll a lead into a sequence (lead's owner agent, or admin).
create or replace function public.enroll_drip(p_lead uuid, p_sequence uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_owner uuid; v_steps jsonb; v_off int; v_id uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select owner_id into v_owner from public.leads where id = p_lead;
  if not (public.auth_is_admin() or v_owner = v_self
          or exists (select 1 from public.profiles p where p.id = v_owner and p.hierarchy_path <@ public.auth_hierarchy_path())) then
    raise exception 'not authorized';
  end if;
  select steps into v_steps from public.drip_sequences where id = p_sequence and active = true;
  if v_steps is null or jsonb_array_length(v_steps) = 0 then raise exception 'sequence not available'; end if;
  v_off := coalesce((v_steps->0->>'offset_days')::int, 0);
  insert into public.drip_enrollments(sequence_id, lead_id, owner_id, current_index, next_due_at)
  values (p_sequence, p_lead, coalesce(v_owner, v_self), 0, now() + make_interval(days => v_off))
  on conflict (sequence_id, lead_id) do update set status = 'active', current_index = 0,
    next_due_at = now() + make_interval(days => v_off)
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.enroll_drip(uuid, uuid) from public, anon;
grant  execute on function public.enroll_drip(uuid, uuid) to authenticated;

-- Fire all due steps: create a follow-up for the lead + notify the owning agent.
-- Channel today = in-app/follow-up; SMS/WhatsApp can be added behind a config flag.
create or replace function public.process_due_drips()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; v_step jsonb; v_steps jsonb; v_count int := 0; v_off int;
begin
  if not public.auth_is_admin() then raise exception 'not authorized'; end if;
  for r in select e.*, s.steps as seq_steps from public.drip_enrollments e
           join public.drip_sequences s on s.id = e.sequence_id
           where e.status = 'active' and e.next_due_at is not null and e.next_due_at <= now()
           limit 500 loop
    v_steps := r.seq_steps;
    if r.current_index >= jsonb_array_length(v_steps) then
      update public.drip_enrollments set status = 'done' where id = r.id;
      continue;
    end if;
    v_step := v_steps->r.current_index;
    begin
      insert into public.follow_ups(lead_id, due_at, note, status)
      values (r.lead_id, now(), coalesce(v_step->>'title','Follow up') || ' — ' || coalesce(v_step->>'body',''), 'pending');
      if r.owner_id is not null then
        insert into public.notifications(user_id, type, title, body, data)
        values (r.owner_id, 'drip', coalesce(v_step->>'title','Drip step due'),
                coalesce(v_step->>'body','Follow up with this lead.'),
                jsonb_build_object('lead_id', r.lead_id, 'sequence_id', r.sequence_id));
      end if;
    exception when others then null; end;
    -- advance
    if r.current_index + 1 >= jsonb_array_length(v_steps) then
      update public.drip_enrollments set status = 'done', current_index = r.current_index + 1 where id = r.id;
    else
      v_off := coalesce((v_steps->(r.current_index+1)->>'offset_days')::int, 1);
      update public.drip_enrollments set current_index = r.current_index + 1,
        next_due_at = now() + make_interval(days => v_off) where id = r.id;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke execute on function public.process_due_drips() from public, anon;
grant  execute on function public.process_due_drips() to authenticated;

-- ════════════════ REELS ════════════════════════════════════════════════════
create table if not exists public.property_reels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  video_url   text not null,
  poster_url  text,
  caption     text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_reels_created on public.property_reels(created_at desc);

alter table public.property_reels enable row level security;
drop policy if exists reels_read on public.property_reels;
create policy reels_read on public.property_reels for select to authenticated using (true);
drop policy if exists reels_insert on public.property_reels;
create policy reels_insert on public.property_reels for insert to authenticated with check (user_id = auth.uid());
drop policy if exists reels_manage on public.property_reels;
create policy reels_manage on public.property_reels for all to authenticated
  using (user_id = auth.uid() or public.auth_is_admin())
  with check (user_id = auth.uid() or public.auth_is_admin());
grant select, insert, update, delete on public.property_reels to authenticated;

-- ════════════════ feature registry ═════════════════════════════════════════
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('escrow',      'Escrow & Token Milestones', 'Track booking payments in stages with controlled release.', 'partner', 'lock-closed', 73),
  ('drips',       'Automated Follow-up Drips', 'Scheduled lead nurture — auto-creates follow-ups + reminders.', 'partner', 'mail-unread', 74),
  ('reels',       'Property Reels',            'Short vertical video discovery feed.',                       'buyer',   'play-circle', 52),
  ('virtual_stage','AI Virtual Staging',       'Furnish empty-room photos with AI (needs image-gen key).',   'ai',      'color-wand', 142),
  ('wa_inbound',  'WhatsApp Lead-capture',     'Inbound WhatsApp messages become leads (needs WA Business).', 'partner', 'logo-whatsapp', 75)
on conflict (key) do nothing;
