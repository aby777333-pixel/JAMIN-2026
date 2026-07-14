-- 0096: app-report fixes (2026-07-14)
-- 1) Help & Support "Website" link was stored WITH literal quote characters
--    ("https://jaminproperties.com") so Linking.openURL failed — strip wrapping
--    quotes/whitespace from every app_content value (idempotent, data-only).
-- 2) KYC form had no proof upload — add a required `proof_url` photo field to
--    the dynamic KYC form definition (renders via the new 'photo' field type).

update public.app_content
set value = trim(both from regexp_replace(trim(both from value), '^"(.*)"$', '\1'))
where value ~ '^\s*".*"\s*$';

update public.form_definitions
set fields = fields || jsonb_build_array(jsonb_build_object(
  'name', 'proof_url',
  'type', 'photo',
  'label', 'ID proof (upload photo)',
  'required', true,
  'help', 'A clear photo or screenshot of the ID entered above'
)),
    updated_at = now()
where key = 'kyc'
  and not exists (
    select 1 from jsonb_array_elements(fields) e where e->>'name' = 'proof_url'
  );
