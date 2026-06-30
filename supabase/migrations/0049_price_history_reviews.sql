-- JAMIN Properties — 0049 price history + project reviews + calculator config.
-- (1) price_history: every price change on a listing is logged (feeds the
--     price-history panel + future market-trends). (2) property_reviews: verified
--     buyers rate a project (locality/builder/project trust). (3) seed dynamic
--     stamp-duty rates in system_config for the cost calculators. All additive.

-- ── price history ───────────────────────────────────────────────────────────
create table if not exists public.price_history (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  old_price   numeric(18,2),
  new_price   numeric(18,2) not null,
  changed_by  uuid,
  changed_at  timestamptz not null default now()
);
create index if not exists idx_price_history_prop on public.price_history(property_id, changed_at desc);

alter table public.price_history enable row level security;
-- Prices are public to signed-in users (mirrors properties read); inserts via trigger only.
drop policy if exists price_history_read on public.price_history;
create policy price_history_read on public.price_history for select to authenticated using (true);
grant select on public.price_history to authenticated;

create or replace function public.log_price_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price then
    begin
      insert into public.price_history(property_id, old_price, new_price, changed_by)
      values (new.id, case when tg_op = 'UPDATE' then old.price else null end, new.price, auth.uid());
    exception when others then
      null; -- history logging must never block a listing write
    end;
  end if;
  return null;
end $$;
revoke execute on function public.log_price_change() from public, anon, authenticated;
drop trigger if exists trg_log_price_change on public.properties;
create trigger trg_log_price_change after insert or update of price on public.properties
  for each row execute function public.log_price_change();

-- ── project reviews & ratings ───────────────────────────────────────────────
create table if not exists public.property_reviews (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  title      text,
  body       text,
  status     text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index if not exists idx_property_reviews_project on public.property_reviews(project_id);
drop trigger if exists trg_property_reviews_updated on public.property_reviews;
create trigger trg_property_reviews_updated before update on public.property_reviews
  for each row execute function public.set_updated_at();

alter table public.property_reviews enable row level security;
-- Read: published reviews to everyone signed-in; your own (any status); admin all.
drop policy if exists property_reviews_read on public.property_reviews;
create policy property_reviews_read on public.property_reviews for select to authenticated
  using (status = 'published' or user_id = auth.uid() or public.auth_is_admin());
-- Write your own review; admins moderate.
drop policy if exists property_reviews_insert on public.property_reviews;
create policy property_reviews_insert on public.property_reviews for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists property_reviews_update_own on public.property_reviews;
create policy property_reviews_update_own on public.property_reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists property_reviews_admin on public.property_reviews;
create policy property_reviews_admin on public.property_reviews for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
grant select, insert, update, delete on public.property_reviews to authenticated;

-- Aggregate rating for a project (published only). SECURITY DEFINER + explicit
-- published filter so anyone signed-in gets the public average.
create or replace function public.project_rating(p_project uuid)
returns table (avg_rating numeric, review_count bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(round(avg(rating)::numeric, 2), 0)::numeric, count(*)::bigint
  from public.property_reviews
  where project_id = p_project and status = 'published';
$$;
revoke execute on function public.project_rating(uuid) from public, anon;
grant  execute on function public.project_rating(uuid) to authenticated;

-- ── dynamic stamp-duty / registration rates (admin-editable) ────────────────
insert into public.system_config(key, value)
values ('stamp_duty_rates', jsonb_build_object(
  'default', 6,
  'registration_pct', 1,
  'states', jsonb_build_object(
    'Andhra Pradesh', 5, 'Karnataka', 5.6, 'Kerala', 8, 'Maharashtra', 6,
    'Tamil Nadu', 7, 'Telangana', 5, 'Delhi', 6, 'Gujarat', 4.9, 'Uttar Pradesh', 7
  )
))
on conflict (key) do nothing;
