-- JAMIN Properties — 0101 Seller module (India): seller entity types, dynamic
-- document-type catalog, expanded property-type catalog, listing lifecycle
-- (hide / rented / archive / renew), KYC expansion (Voter ID / DL / selfie /
-- bank details), reject-with-reason plumbing, listing edit audit.
-- FULLY ADDITIVE — existing rows keep behaviour via defaults.

-- ─── 1. Seller entity type (dynamic text, no CHECK — rule §13) ──────────────
-- individual / joint / builder_developer / company / partnership / llp /
-- private_limited / trust_society / poa … admin can introduce more at runtime.
alter table public.profiles
  add column if not exists seller_entity_type text not null default 'individual';

-- ─── 2. Dynamic document-type catalog (admin-manageable, zero code change) ──
create table if not exists public.document_types (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  category   text not null default 'property',   -- property | kyc | other
  active     boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
alter table public.document_types enable row level security;
drop policy if exists document_types_read on public.document_types;
create policy document_types_read on public.document_types for select to anon, authenticated using (true);
drop policy if exists document_types_admin on public.document_types;
create policy document_types_admin on public.document_types for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
grant select on public.document_types to anon, authenticated;
grant insert, update, delete on public.document_types to authenticated;

insert into public.document_types (name, category, sort_order) values
  ('Sale Deed', 'property', 10), ('Title Deed', 'property', 20), ('Mother Deed', 'property', 30),
  ('Patta', 'property', 40), ('Chitta', 'property', 50), ('Adangal', 'property', 60),
  ('Encumbrance Certificate (EC)', 'property', 70), ('Khata Certificate', 'property', 80),
  ('Khata Extract', 'property', 90), ('Mutation Certificate', 'property', 100),
  ('Property Tax Receipt', 'property', 110), ('Approved Building Plan', 'property', 120),
  ('Completion Certificate', 'property', 130), ('Occupancy Certificate', 'property', 140),
  ('Possession Letter', 'property', 150), ('RERA Registration', 'property', 160),
  ('No Objection Certificate (NOC)', 'property', 170), ('Power of Attorney', 'property', 180),
  ('Allotment Letter', 'property', 190), ('Share Certificate', 'property', 200),
  ('Society Approval Documents', 'property', 210), ('Land Survey Documents', 'property', 220),
  ('FMB Sketch', 'property', 230), ('Survey Number Details', 'property', 240),
  ('Layout approval', 'property', 250), ('Tax receipt', 'property', 260), ('Other', 'property', 900)
on conflict (name) do nothing;

-- ─── 3. Property-type catalog additions (idempotent by slug) ────────────────
insert into public.property_types (slug, name, code_prefix) values
  ('agricultural',      'Agricultural Land',  'AG'),
  ('independent_house', 'Independent House',  'IH'),
  ('flat',              'Flat',               'FT'),
  ('studio_apartment',  'Studio Apartment',   'SA'),
  ('builder_floor',     'Builder Floor',      'BF'),
  ('commercial_plot',   'Commercial Plot',    'CP'),
  ('office_space',      'Office Space',       'OF'),
  ('shop',              'Shop',               'SH'),
  ('warehouse',         'Warehouse',          'WH'),
  ('factory',           'Factory',            'FC'),
  ('industrial_land',   'Industrial Land',    'IN'),
  ('retail_space',      'Retail Space',       'RT'),
  ('hotel',             'Hotel',              'HT'),
  ('resort',            'Resort',             'RS'),
  ('rental',            'Rental Property',    'RE'),
  ('coworking',         'Co-working Space',   'CW'),
  ('mixed_use',         'Mixed-use Property', 'MX')
on conflict (slug) do nothing;

-- ─── 4. Listing lifecycle: rented status + hide + archive + renew ───────────
alter table public.properties
  add column if not exists is_hidden   boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists renewed_at  timestamptz;
alter table public.properties drop constraint if exists properties_status_check;
alter table public.properties add constraint properties_status_check
  check (status in ('available', 'reserved', 'sold', 'rented'));

-- Public visibility now excludes hidden/archived listings; sellers still see
-- their own and admins see everything (same shape as the 0037 policy).
drop policy if exists properties_read on public.properties;
create policy properties_read on public.properties for select to authenticated
  using (
    (coalesce(approval_status, 'approved') = 'approved'
       and coalesce(is_hidden, false) = false
       and archived_at is null)
    or public.auth_is_admin()
    or seller_id = auth.uid()
  );

-- ─── 5. Listing edit audit (field-level history for price/attrs edits) ──────
create or replace function public.trg_audit_property_edit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (old.price is distinct from new.price) or (old.attrs is distinct from new.attrs)
     or (old.is_hidden is distinct from new.is_hidden) or (old.archived_at is distinct from new.archived_at) then
    insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
    values (auth.uid(), 'property.edited', 'property', new.id,
      jsonb_build_object(
        'old_price', old.price, 'new_price', new.price,
        'hidden', new.is_hidden, 'archived', new.archived_at is not null,
        'attrs_changed', old.attrs is distinct from new.attrs));
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists trg_audit_property_edit on public.properties;
create trigger trg_audit_property_edit after update on public.properties
  for each row execute function public.trg_audit_property_edit();

-- ─── 6. KYC expansion: more ID options, selfie, bank details ────────────────
-- Extend id_type options in place (Aadhaar/PAN/Passport → + Driving Licence, Voter ID).
update public.form_definitions
set fields = (
  select jsonb_agg(
    case when e->>'name' = 'id_type'
      then jsonb_set(e, '{options}', '["Aadhaar","PAN","Passport","Driving Licence","Voter ID"]'::jsonb)
      else e end)
  from jsonb_array_elements(fields) e
), updated_at = now()
where key = 'kyc';

-- Extend address-proof options (+ Property Tax Receipt, Driving Licence).
update public.form_definitions
set fields = (
  select jsonb_agg(
    case when e->>'name' = 'address_proof_type'
      then jsonb_set(e, '{options}',
        '["Aadhaar","Utility bill","Bank statement","Rent agreement","Passport","Property Tax Receipt","Driving Licence"]'::jsonb)
      else e end)
  from jsonb_array_elements(fields) e
), updated_at = now()
where key = 'kyc';

-- Selfie for identity verification (photo field renders with zero app change).
update public.form_definitions
set fields = fields || '[
  {"name":"selfie_url","type":"photo","label":"Selfie (for identity verification)","required":true,
   "hint":"A clear photo of your face, taken now."}
]'::jsonb, updated_at = now()
where key = 'kyc'
  and not exists (select 1 from jsonb_array_elements(fields) e where e->>'name' = 'selfie_url');

-- Bank account for payouts/refunds (optional; admin verifies alongside KYC).
update public.form_definitions
set fields = fields || '[
  {"name":"bank_account_name","type":"text","label":"Bank account holder name (for payouts)","required":false},
  {"name":"bank_account_number","type":"text","label":"Bank account number","required":false},
  {"name":"bank_ifsc","type":"text","label":"IFSC code","required":false}
]'::jsonb, updated_at = now()
where key = 'kyc'
  and not exists (select 1 from jsonb_array_elements(fields) e where e->>'name' = 'bank_account_number');

-- ─── 7. Feature registry ─────────────────────────────────────────────────────
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('seller_lifecycle', 'Seller Listing Lifecycle', 'Sellers edit, hide, mark sold/rented, archive and renew their listings — every change audited.', 'partner', 'refresh', 180),
  ('document_catalog', 'Document Type Catalog', 'Admin-managed list of Indian property document types (Sale Deed, Patta, EC, Khata…) — add new types with zero code changes.', 'admin', 'folder-open', 182)
on conflict (key) do nothing;
