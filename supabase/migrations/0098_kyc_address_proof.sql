-- 0098: KYC gets explicit ID + ADDRESS proof provisions (owner, 2026-07-14).
-- The kyc form already collects id_type / id_number / proof_url (ID photo,
-- 0096). Append an address-proof type picker and an address-proof photo so
-- verification covers both identity and address. Idempotent, data-only.

update public.form_definitions
set fields = fields || '[
  {"name":"address_proof_type","type":"select","label":"Address proof type","required":true,"options":["Aadhaar","Utility bill","Bank statement","Rent agreement","Passport"]},
  {"name":"address_proof_url","type":"photo","label":"Address proof (upload photo)","required":true,"help":"A clear photo of the address proof you chose above"}
]'::jsonb,
    updated_at = now()
where key = 'kyc'
  and not exists (
    select 1 from jsonb_array_elements(fields) e where e->>'name' = 'address_proof_url'
  );
