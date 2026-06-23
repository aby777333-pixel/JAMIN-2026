-- JAMIN Properties — 0003 inventory + plot coding + auto-replacement engine (§3).
-- Every plot is dynamically coded (PREFIX-0001). On sale the engine marks it sold,
-- audits the event, and promotes the next available plot — all in Postgres so it
-- is deterministic regardless of which client triggered the sale.

create table public.properties (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  plan_id          uuid references public.plans(id) on delete set null,
  property_type_id uuid not null references public.property_types(id),
  plot_code        text unique not null,
  price            numeric(18,2) not null default 0,
  status           text not null default 'available'
                     check (status in ('available','reserved','sold')),
  coordinates      jsonb,                       -- {lat,lng}
  media            jsonb not null default '[]'::jsonb,
  attrs            jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_properties_project on public.properties(project_id);
create index idx_properties_status on public.properties(status);
create trigger trg_properties_updated before update on public.properties
  for each row execute function public.set_updated_at();

create table public.inventory_events (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  type        text not null,                    -- created, reserved, sold, promoted, commission_due
  actor_id    uuid references public.profiles(id) on delete set null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index idx_inventory_events_prop on public.inventory_events(property_id);

-- Per-prefix counter so plot codes are gap-free & race-safe.
create table public.plot_counters (
  prefix text primary key,
  next   int  not null default 1
);

create or replace function public.next_plot_code(p_type uuid)
returns text language plpgsql as $$
declare
  v_prefix text;
  v_n int;
begin
  select code_prefix into v_prefix from public.property_types where id = p_type;
  if v_prefix is null then
    raise exception 'unknown property_type %', p_type;
  end if;
  insert into public.plot_counters(prefix, next) values (v_prefix, 1)
    on conflict (prefix) do update set next = public.plot_counters.next + 1
    returning next into v_n;
  return v_prefix || '-' || lpad(v_n::text, 4, '0');
end $$;

-- Auto-assign plot_code on insert when not supplied.
create or replace function public.assign_plot_code()
returns trigger language plpgsql as $$
begin
  if new.plot_code is null or length(new.plot_code) = 0 then
    new.plot_code := public.next_plot_code(new.property_type_id);
  end if;
  return new;
end $$;
create trigger trg_properties_code before insert on public.properties
  for each row execute function public.assign_plot_code();

create or replace function public.log_property_created()
returns trigger language plpgsql as $$
begin
  insert into public.inventory_events(property_id, type, payload)
  values (new.id, 'created', jsonb_build_object('plot_code', new.plot_code));
  return new;
end $$;
create trigger trg_properties_created after insert on public.properties
  for each row execute function public.log_property_created();

-- Auto-replacement engine: plot sold -> audit + promote next available plot.
create or replace function public.handle_plot_sold()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_next uuid;
begin
  if new.status = 'sold' and coalesce(old.status, '') <> 'sold' then
    insert into public.inventory_events(property_id, type, actor_id, payload)
    values (new.id, 'sold', auth.uid(), jsonb_build_object('price', new.price));

    -- Signal the commission engine (consumed in P5).
    insert into public.inventory_events(property_id, type, actor_id, payload)
    values (new.id, 'commission_due', auth.uid(),
            jsonb_build_object('price', new.price, 'project_id', new.project_id));

    -- Promote the next available plot in the same project/plan/type.
    select id into v_next from public.properties
      where project_id = new.project_id
        and property_type_id = new.property_type_id
        and coalesce(plan_id::text,'') = coalesce(new.plan_id::text,'')
        and status = 'available'
        and id <> new.id
      order by plot_code asc
      limit 1;

    if v_next is not null then
      update public.properties
        set attrs = jsonb_set(attrs, '{featured}', 'true'::jsonb, true)
        where id = v_next;
      insert into public.inventory_events(property_id, type, payload)
      values (v_next, 'promoted', jsonb_build_object('replaced', new.id));
    end if;
  end if;
  return new;
end $$;
create trigger trg_properties_sold after update of status on public.properties
  for each row execute function public.handle_plot_sold();
