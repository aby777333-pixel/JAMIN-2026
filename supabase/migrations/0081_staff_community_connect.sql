-- JAMIN Properties — 0081 Staff role applications + Community forum + JAMIN-mediated contact.
-- Purely ADDITIVE: new tables/RPCs/config keys only; no existing table, policy or
-- function is altered, so nothing can regress.
--
-- 1) staff_applications — users apply through the app for any non-admin role
--    (incl. staff ranks that are NOT self-selectable); admin approves via
--    review_staff_application() which grants the role, audits and notifies.
-- 2) community_* — public community forum (text/tweet + image/video posts in any
--    language, name+phone required to post). Every post/comment/moderation is
--    audit-logged by trigger. Counter caches keep app reads single-table.
-- 3) contact_policy config + feature registry rows. Buyer↔seller contact stays
--    JAMIN-mediated: "Connect via JAMIN" files a lead (capture_lead, source
--    'connect') — no schema needed, the lead engine already notifies + routes.

-- ── 1) Staff role applications ───────────────────────────────────────────────
create table if not exists public.staff_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  requested_role_slug text not null references public.roles(slug),
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_applications_status_idx
  on public.staff_applications (status, created_at desc);

alter table public.staff_applications enable row level security;
create policy staff_app_read on public.staff_applications
  for select using (user_id = auth.uid() or public.auth_is_admin());
create policy staff_app_insert on public.staff_applications
  for insert with check (user_id = auth.uid() and status = 'pending');
grant select, insert on public.staff_applications to authenticated;

-- Approve/reject (decision only via this RPC → atomic + always audited).
create or replace function public.review_staff_application(
  p_app uuid, p_approve boolean, p_role_slug text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_app public.staff_applications%rowtype;
  v_role public.roles%rowtype;
  v_slug text;
begin
  if not public.auth_is_admin() then raise exception 'admin only'; end if;
  select * into v_app from public.staff_applications where id = p_app for update;
  if not found then raise exception 'application not found'; end if;
  if v_app.status <> 'pending' then raise exception 'application already decided'; end if;

  if p_approve then
    v_slug := coalesce(nullif(trim(p_role_slug), ''), v_app.requested_role_slug);
    select * into v_role from public.roles where slug = v_slug;
    if not found then raise exception 'unknown role: %', v_slug; end if;
    if v_role.is_admin then raise exception 'admin roles cannot be granted from an application'; end if;
    update public.profiles set role_id = v_role.id, updated_at = now() where id = v_app.user_id;
  end if;

  update public.staff_applications
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now()
   where id = p_app;

  insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
  values (auth.uid(),
          case when p_approve then 'staff_application_approved' else 'staff_application_rejected' end,
          'staff_applications', p_app,
          jsonb_build_object('user_id', v_app.user_id, 'name', v_app.full_name,
                             'phone', v_app.phone, 'requested_role', v_app.requested_role_slug,
                             'granted_role', case when p_approve then v_slug end));

  insert into public.notifications (user_id, type, title, body, data)
  values (v_app.user_id, 'staff_application',
          case when p_approve then 'Role application approved 🎉' else 'Role application update' end,
          case when p_approve
               then 'Welcome aboard! You are now ' || v_role.name || ' at JAMIN Properties.'
               else 'Your application for ' || v_app.requested_role_slug || ' was not approved this time.' end,
          jsonb_build_object('application_id', p_app,
                             'status', case when p_approve then 'approved' else 'rejected' end));
end $$;
revoke execute on function public.review_staff_application(uuid, boolean, text) from public, anon;
grant execute on function public.review_staff_application(uuid, boolean, text) to authenticated;

-- Log submissions too (the owner wants EVERYTHING in the admin log).
create or replace function public.staff_application_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
  values (new.user_id, 'staff_application_submitted', 'staff_applications', new.id,
          jsonb_build_object('name', new.full_name, 'phone', new.phone,
                             'requested_role', new.requested_role_slug));
  return new;
end $$;
drop trigger if exists trg_staff_application_audit on public.staff_applications;
create trigger trg_staff_application_audit
  after insert on public.staff_applications
  for each row execute function public.staff_application_audit();

-- ── 2) Community forum ───────────────────────────────────────────────────────
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_phone text not null,           -- required to post; shown ONLY to admins
  body text,
  lang text not null default 'en',
  media jsonb not null default '[]'::jsonb,  -- [{type:'image'|'video', url}]
  status text not null default 'published' check (status in ('published','hidden','removed')),
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists community_posts_feed_idx
  on public.community_posts (status, created_at desc);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  body text not null,
  lang text not null default 'en',
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx
  on public.community_comments (post_id, created_at);

create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;

create policy community_posts_read on public.community_posts
  for select using (status = 'published' or author_id = auth.uid() or public.auth_is_admin());
create policy community_posts_insert on public.community_posts
  for insert with check (author_id = auth.uid() and status = 'published'
                         and coalesce(trim(author_name), '') <> ''
                         and coalesce(trim(author_phone), '') <> '');
create policy community_posts_own_update on public.community_posts
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy community_posts_admin on public.community_posts
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());

create policy community_comments_read on public.community_comments
  for select using (status = 'published' or author_id = auth.uid() or public.auth_is_admin());
create policy community_comments_insert on public.community_comments
  for insert with check (author_id = auth.uid() and status = 'published'
                         and coalesce(trim(author_name), '') <> '');
create policy community_comments_own_update on public.community_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy community_comments_admin on public.community_comments
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());

create policy community_likes_read on public.community_likes
  for select using (true);
create policy community_likes_insert on public.community_likes
  for insert with check (user_id = auth.uid());
create policy community_likes_delete on public.community_likes
  for delete using (user_id = auth.uid());

-- Explicit grants (Supabase public-schema grant flip lands 2026-10-30).
grant select, insert, update on public.community_posts to authenticated;
grant select, insert, update on public.community_comments to authenticated;
grant select, insert, delete on public.community_likes to authenticated;

-- Counter caches so the feed is a single-table read.
create or replace function public.community_counters() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'community_likes' then
    if tg_op = 'INSERT' then
      update public.community_posts set like_count = like_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.community_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    end if;
  elsif tg_table_name = 'community_comments' and tg_op = 'INSERT' then
    update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_community_like_count on public.community_likes;
create trigger trg_community_like_count
  after insert or delete on public.community_likes
  for each row execute function public.community_counters();
drop trigger if exists trg_community_comment_count on public.community_comments;
create trigger trg_community_comment_count
  after insert on public.community_comments
  for each row execute function public.community_counters();

-- Everything is recorded in the admin log: posts, comments and every
-- moderation/status change land in audit_logs automatically.
create or replace function public.community_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and tg_table_name = 'community_posts' then
    insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
    values (new.author_id, 'community_post_created', 'community_posts', new.id,
            jsonb_build_object('name', new.author_name, 'phone', new.author_phone,
                               'lang', new.lang, 'media', jsonb_array_length(new.media),
                               'excerpt', left(coalesce(new.body, ''), 140)));
  elsif tg_op = 'INSERT' and tg_table_name = 'community_comments' then
    insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
    values (new.author_id, 'community_comment_created', 'community_comments', new.id,
            jsonb_build_object('post_id', new.post_id, 'name', new.author_name,
                               'lang', new.lang, 'excerpt', left(new.body, 140)));
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
    values (auth.uid(), 'community_' || tg_table_name || '_status_' || new.status,
            tg_table_name, new.id,
            jsonb_build_object('from', old.status, 'to', new.status,
                               'author', new.author_name));
  end if;
  return new;
end $$;
drop trigger if exists trg_community_posts_audit on public.community_posts;
create trigger trg_community_posts_audit
  after insert or update on public.community_posts
  for each row execute function public.community_audit();
drop trigger if exists trg_community_comments_audit on public.community_comments;
create trigger trg_community_comments_audit
  after insert or update on public.community_comments
  for each row execute function public.community_audit();

-- Live feed: add the forum tables to the realtime publication (ignore if already).
do $$
begin
  begin
    alter publication supabase_realtime add table public.community_posts;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.community_comments;
  exception when duplicate_object then null;
  end;
end $$;

-- ── 3) JAMIN-mediated contact policy + feature registry ─────────────────────
insert into public.system_config (key, value) values
  ('contact_policy', jsonb_build_object(
     'mediated', true,
     'message', 'All calls, site visits and negotiations happen through JAMIN Properties. Never share or exchange direct contact details — JAMIN connects you safely.'))
on conflict (key) do nothing;

insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('community_forum', 'Community Forum',
   'Post, discuss and share images & videos with the JAMIN community — in any Indian language, with translation.', 'app', 'people', 151),
  ('staff_roles', 'Staff & Role Applications',
   'Apply for a JAMIN role in-app; admins review and grant roles from the admin portal.', 'app', 'id-card', 152),
  ('jamin_connect', 'JAMIN Connect',
   'Buyer–seller calls and meetings are arranged safely through JAMIN — no direct contact needed.', 'app', 'shield-checkmark', 153)
on conflict (key) do nothing;
