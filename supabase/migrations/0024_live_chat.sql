-- JAMIN Properties — 0024 Live Chat (§4 Buyer App "Live Chat"). Supabase Realtime, no 3rd party.
-- A buyer opens a support thread; admins (support console) + an assigned agent can reply.

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  agent_id uuid references public.profiles(id) on delete set null,
  subject text,
  status text not null default 'open',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists chat_threads_buyer_idx on public.chat_threads (buyer_id);
create index if not exists chat_threads_agent_idx on public.chat_threads (agent_id);
create index if not exists chat_threads_recent_idx on public.chat_threads (last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages (thread_id, created_at);

alter table public.chat_threads enable row level security;
alter table public.messages enable row level security;

-- Can the caller see this thread? (SECURITY DEFINER avoids RLS recursion in messages policies.)
create or replace function public.can_see_thread(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chat_threads th
    where th.id = t and (th.buyer_id = auth.uid() or th.agent_id = auth.uid() or public.auth_is_admin())
  );
$$;

create policy chat_threads_select on public.chat_threads for select to authenticated
  using (buyer_id = auth.uid() or agent_id = auth.uid() or public.auth_is_admin());
create policy chat_threads_insert on public.chat_threads for insert to authenticated
  with check (buyer_id = auth.uid() or public.auth_is_admin());
create policy chat_threads_update on public.chat_threads for update to authenticated
  using (buyer_id = auth.uid() or agent_id = auth.uid() or public.auth_is_admin())
  with check (buyer_id = auth.uid() or agent_id = auth.uid() or public.auth_is_admin());

create policy messages_select on public.messages for select to authenticated
  using (public.can_see_thread(thread_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_see_thread(thread_id));

-- Bump the thread's last_message_at on every new message.
create or replace function public.touch_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.chat_threads set last_message_at = now() where id = new.thread_id;
  return new;
end $$;
drop trigger if exists messages_touch on public.messages;
create trigger messages_touch after insert on public.messages
  for each row execute function public.touch_thread();

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_threads;

grant select, insert, update on public.chat_threads to authenticated;
grant select, insert, update on public.messages to authenticated;
grant execute on function public.can_see_thread(uuid) to authenticated;
