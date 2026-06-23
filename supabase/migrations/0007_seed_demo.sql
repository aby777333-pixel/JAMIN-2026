-- JAMIN Properties — demo seed (§16). Idempotent-ish: safe to run once on a fresh DB.
-- Mirrors supabase/migrations/0007_seed_demo.sql.

insert into public.property_types (slug, name, code_prefix) values
  ('land','Land','LD'),
  ('plot','Plot','PL'),
  ('villa','Villa','VL'),
  ('apartment','Apartment','AP'),
  ('commercial','Commercial','CM'),
  ('farm_land','Farm Land','FL')
on conflict (slug) do nothing;

insert into public.projects (code, name, location, description) values
  ('JP-A','Jamin Greens','Hyderabad','Premium gated plots & villas'),
  ('JP-B','Jamin Heights','Bengaluru','Apartments & commercial spaces')
on conflict (code) do nothing;

insert into public.card_templates (name, config, is_default) values
  ('Signature', '{"accent":"#FD0001","mono":"JetBrainsMono"}'::jsonb, true)
on conflict do nothing;

insert into public.form_definitions (key, name, fields) values
  ('buyer','Buyer Enquiry','[{"name":"budget","label":"Budget","type":"number"},{"name":"location","label":"Preferred location","type":"text"}]'::jsonb),
  ('kyc','KYC','[{"name":"id_type","label":"ID type","type":"select","options":["Aadhaar","PAN","Passport"]},{"name":"id_number","label":"ID number","type":"text"}]'::jsonb),
  ('lead','Lead Capture','[{"name":"name","label":"Name","type":"text"},{"name":"phone","label":"Phone","type":"text"}]'::jsonb)
on conflict (key) do nothing;

insert into public.commission_rules (name, scope, match, formula, priority)
select 'Default 2% on Jamin Greens', 'project',
       jsonb_build_object('project_id', p.id),
       '{"type":"percent","value":2}'::jsonb, 50
from public.projects p where p.code = 'JP-A'
on conflict do nothing;

-- Sample inventory (plot codes auto-assigned by trigger).
do $$
declare
  v_proj uuid; v_plan uuid;
  v_land uuid; v_plot uuid; v_villa uuid; v_apt uuid;
  i int;
begin
  select id into v_proj from public.projects where code = 'JP-A';
  select id into v_land from public.property_types where slug = 'land';
  select id into v_plot from public.property_types where slug = 'plot';
  select id into v_villa from public.property_types where slug = 'villa';
  select id into v_apt from public.property_types where slug = 'apartment';

  insert into public.plans (project_id, name) values (v_proj, 'Plan A') returning id into v_plan;

  if not exists (select 1 from public.properties where project_id = v_proj) then
    for i in 1..6 loop
      insert into public.properties (project_id, plan_id, property_type_id, price, coordinates)
      values (v_proj, v_plan, v_plot, 1500000 + i*50000,
              jsonb_build_object('lat', 17.385 + i*0.001, 'lng', 78.486 + i*0.001));
    end loop;
    for i in 1..3 loop
      insert into public.properties (project_id, plan_id, property_type_id, price)
      values (v_proj, v_plan, v_villa, 9500000 + i*250000);
    end loop;
    for i in 1..2 loop
      insert into public.properties (project_id, plan_id, property_type_id, price)
      values (v_proj, v_plan, v_land, 4200000 + i*100000);
    end loop;
  end if;
end $$;
