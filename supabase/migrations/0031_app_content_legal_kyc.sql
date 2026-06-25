-- 0031 — More admin-editable app content: Legal links + KYC copy.
-- Additive seed only; values mirror current hardcoded strings (zero regression).
insert into public.app_content (key, grp, label, kind, value, sort_order) values
  ('legal.terms_url',   'Legal', 'Terms & Conditions URL', 'url',      '',                                    180),
  ('legal.privacy_url', 'Legal', 'Privacy Policy URL',     'url',      'https://jaminproperties.co/privacy',  190),
  ('kyc.intro',         'KYC',   'KYC — banner/intro line','text',     'Verify your identity to unlock payouts', 200),
  ('kyc.pending_msg',   'KYC',   'KYC — pending message',  'textarea', 'Your documents are under review. We''ll notify you once approved.', 210),
  ('kyc.verified_msg',  'KYC',   'KYC — verified message', 'textarea', 'You''re verified. Nothing more to do here.', 220)
on conflict (key) do nothing;
