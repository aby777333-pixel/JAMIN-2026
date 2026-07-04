-- JAMIN Properties — 0083 gentle community anti-spam rate limit.
-- A user can publish at most 20 posts and 60 comments per rolling hour; the
-- 21st/61st insert raises a friendly error the app shows as-is. BEFORE INSERT
-- triggers only — no existing table, policy or flow changes, nothing regresses.
create or replace function public.community_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
  v_cap int;
begin
  if tg_table_name = 'community_posts' then
    v_cap := 20;
    select count(*) into v_n from public.community_posts
     where author_id = new.author_id and created_at > now() - interval '1 hour';
  else
    v_cap := 60;
    select count(*) into v_n from public.community_comments
     where author_id = new.author_id and created_at > now() - interval '1 hour';
  end if;
  if v_n >= v_cap then
    raise exception 'Slow down a little 🙏 — you have reached the hourly limit. Please try again soon.';
  end if;
  return new;
end $$;

drop trigger if exists trg_community_posts_rate on public.community_posts;
create trigger trg_community_posts_rate
  before insert on public.community_posts
  for each row execute function public.community_rate_limit();

drop trigger if exists trg_community_comments_rate on public.community_comments;
create trigger trg_community_comments_rate
  before insert on public.community_comments
  for each row execute function public.community_rate_limit();
