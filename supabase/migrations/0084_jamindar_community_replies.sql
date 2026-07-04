-- JAMIN Properties — 0084 Jamindar replies in the Community forum.
-- New posts automatically get a helpful, JAMIN-positive reply from Jamindar:
-- an AFTER INSERT trigger fires an async pg_net HTTP call to the
-- community-jamindar Edge Function (authenticated by a generated secret in
-- app_secrets), which writes an AI comment (author_id NULL, is_ai=true).
-- Additive: relaxes one NOT NULL (comments.author_id) for AI authors; user
-- inserts still require author_id = auth.uid() via the existing RLS policy,
-- so no user-facing behaviour changes.

alter table public.community_comments alter column author_id drop not null;
alter table public.community_comments add column if not exists is_ai boolean not null default false;

-- One-time generated webhook secret (service-role-only table).
insert into public.app_secrets (key, value)
values ('jamindar_webhook_secret', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

create or replace function public.community_jamindar_ping() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_secret text;
begin
  -- Only ping for real text posts; never let this block posting.
  if new.body is null or length(trim(new.body)) < 8 then return new; end if;
  select value into v_secret from public.app_secrets where key = 'jamindar_webhook_secret';
  if v_secret is null or v_secret = '' then return new; end if;
  begin
    -- 60s timeout: pg_net's 5s default aborts before sarvam-30b finishes.
    perform net.http_post(
      url := 'https://oaqwnjgaypmuafvnfhxv.supabase.co/functions/v1/community-jamindar',
      body := jsonb_build_object('post_id', new.id, 'secret', v_secret),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 60000
    );
  exception when others then
    null; -- fire-and-forget: a queue failure must never fail the post
  end;
  return new;
end $$;

drop trigger if exists trg_community_jamindar on public.community_posts;
create trigger trg_community_jamindar
  after insert on public.community_posts
  for each row execute function public.community_jamindar_ping();
