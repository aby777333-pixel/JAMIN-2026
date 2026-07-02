-- JAMIN Properties — 0071 Faith & Culture layer + NRI desk (all additive).
-- We sell to every community: this adds the storage for a tradition-aware
-- experience (Hindu / Muslim / Christian / Sikh / Jain / none) plus the NRI
-- toolkit. Nothing existing is altered; every block is idempotent.

-- ── 1) "My Tradition" on the profile ─────────────────────────────────────────
-- Nullable; NOT in guard_profile_columns' protected list → self-editable.
alter table public.profiles add column if not exists tradition text
  check (tradition is null or tradition in ('hindu','muslim','christian','sikh','jain','other','none'));

-- ── 2) Multi-faith festival calendar (admin-editable in web admin → Festivals) ─
-- Lunar dates are best-known approximations — admins adjust them in the console.
insert into public.festivals (key, name, festival_date, blurb, sort_order) values
  ('navroz_2026',        'Navroz (Parsi New Year)',   '2026-08-16', 'A fresh beginning — an auspicious day for new ventures and new homes.', 210),
  ('onam_2026',          'Onam (Thiruvonam)',         '2026-08-26', 'Kerala''s golden harvest festival — prosperity, homecoming and new beginnings.', 211),
  ('milad_2026',         'Milad-un-Nabi',             '2026-08-26', 'A blessed day of remembrance — beautiful for family milestones.', 212),
  ('paryushan_2026',     'Paryushan begins',          '2026-09-08', 'Days of reflection for the Jain community — celebrations resume after.', 213),
  ('gurpurab_2026',      'Guru Nanak Gurpurab',       '2026-11-24', 'The Guru''s light on every doorstep — a blessed day for gratitude and giving.', 214),
  ('christmas_2026',     'Christmas',                 '2026-12-25', 'Joy to every home — a season of blessings and new beginnings.', 215),
  ('pongal_2027',        'Pongal / Makar Sankranti',  '2027-01-14', 'Harvest abundance — traditionally wonderful for property decisions.', 216),
  ('eid_fitr_2027',      'Eid-ul-Fitr',               '2027-03-10', 'Eid Mubarak! A day of joy, gratitude and generous new beginnings.', 217),
  ('good_friday_2027',   'Good Friday',               '2027-03-26', 'A solemn day of faith for the Christian community.', 218),
  ('easter_2027',        'Easter',                    '2027-03-28', 'New life and new hope — a beautiful season to bless a new home.', 219),
  ('vaisakhi_2027',      'Vaisakhi / Vishu',          '2027-04-14', 'The new year of abundance — Kerala''s Vishukkani and Punjab''s harvest joy.', 220),
  ('mahavir_2027',       'Mahavir Jayanti',           '2027-04-20', 'A day of peace and right living for the Jain community.', 221),
  ('bakrid_2027',        'Eid-ul-Adha (Bakrid)',      '2027-05-17', 'A day of faith and sharing — blessings on every household.', 222)
on conflict (key) do nothing;

-- ── 3) NRI desk config (admin-editable; MOCK contacts until launch) ──────────
insert into public.system_config (key, value) values
  ('nri_support_phone', '"+91 98765 43210"'::jsonb),
  ('nri_support_whatsapp', '"+91 98765 43210"'::jsonb),
  ('nri_fx_rates', '{"USD": 88.0, "AED": 24.0, "SAR": 23.5, "QAR": 24.2, "KWD": 287.0, "OMR": 229.0, "BHD": 233.0, "GBP": 111.0, "EUR": 95.0, "SGD": 65.0}'::jsonb)
on conflict (key) do nothing;

-- ── 4) Buying-guide content (admin-editable in web admin → App Content) ──────
insert into public.app_content (key, grp, label, kind, value, sort_order) values
  ('nri_docs',          'NRI desk', 'NRI document checklist', 'textarea',
   'Passport & visa copy • PAN card (mandatory for property purchase) • OCI/PIO card if applicable • Overseas address proof • Indian address proof (if any) • Passport-size photos • NRE/NRO bank account details • Power of Attorney (if buying remotely)', 10),
  ('nri_poa',           'NRI desk', 'Power of Attorney guide', 'textarea',
   'A Special Power of Attorney lets a trusted person in India sign for you. Steps: 1) Draft the POA naming the property & powers. 2) Sign it at the Indian Embassy/Consulate in your country (or notarise + apostille). 3) Courier to India. 4) Your attorney adjudicates it with the local Sub-Registrar (stamp duty applies) within 3 months. We guide you at every step.', 20),
  ('nri_tax',           'NRI desk', 'TDS & tax notes', 'textarea',
   'Buying: no extra tax for NRIs vs residents; register in your name with PAN. Selling later: buyer deducts TDS (20%+ on long-term gains for NRI sellers). Rental income is taxable in India (slab rates) — DTAA relief may apply in your country. Always consult a CA for your situation.', 30),
  ('nri_repatriation',  'NRI desk', 'Repatriation rules', 'textarea',
   'Money brought in through NRE/FCNR accounts can generally be repatriated on sale (up to two residential properties, capped at the original foreign-currency investment; excess via NRO within USD 1 million/year with CA certificate 15CA/15CB). Agricultural land has extra restrictions for NRIs — talk to us first.', 40),
  ('nri_payment_plans', 'NRI desk', 'Remittance-friendly payment plans', 'textarea',
   'Pay from your NRE/NRO account in flexible instalments aligned with your remittance schedule. Gulf-based buyers can pay in 3–12 instalments with a booking advance. Every receipt is documented for repatriation compliance.', 50),
  ('nri_loans',         'NRI desk', 'NRI home loans', 'textarea',
   'Most partner lenders offer NRI home loans (salaried in AED/SAR/USD etc.). Typical needs: 3–6 month salary slips, overseas bank statements, passport/visa, PAN, POA for signing. Loan-to-value up to 75–80%. See Home loans in the app to compare lenders.', 60),
  ('guide_women_buyer', 'Buying guides', 'Women-buyer advantage', 'textarea',
   'Registering the property in a woman''s name saves stamp duty in many states (often 1–2% lower) and some lenders offer lower interest for women borrowers. A blessed Griha Lakshmi tradition — and a smart financial one.', 70),
  ('guide_govt_schemes','Buying guides', 'Government schemes', 'textarea',
   'PMAY (Pradhan Mantri Awas Yojana) interest subsidy may apply for first-time buyers within income limits. State housing-board schemes and reduced registration for women/joint registration vary by state — ask us to check your eligibility.', 80),
  ('guide_joint_family','Buying guides', 'Joint-family friendly homes', 'textarea',
   'Look for: a ground-floor bedroom with attached bath for elders • wider doorways • space for a second kitchen or utility • an extra room for extension • nearby park & clinic. Tell us your family size and we''ll shortlist suitable homes.', 90),
  ('guide_land_practicals','Buying guides', 'Land practicality checks', 'textarea',
   'Before buying land, we help verify: bore-well / open-well water feasibility • soil type & load-bearing • flood history & drainage • road access width • electricity availability • title & encumbrance. Ask for the practicality report on any plot.', 100),
  ('guide_milestones',  'Buying guides', 'Milestone planning', 'textarea',
   'Many families buy before a wedding, a child''s schooling, or retirement homecoming. Share your milestone and timeline — we''ll plan the search, booking and registration dates around it (with auspicious dates if you wish).', 110)
on conflict (key) do nothing;

-- ── 5) NRI requests (callback / video visit / documentation help) ────────────
create table if not exists public.nri_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete set null,
  name           text,
  phone          text,
  country        text,
  preferred_time text,
  kind           text not null default 'callback'
                   check (kind in ('callback','video_visit','docs_help')),
  notes          text,
  status         text not null default 'new'
                   check (status in ('new','contacted','done')),
  created_at     timestamptz not null default now()
);
alter table public.nri_requests enable row level security;
drop policy if exists nri_requests_insert on public.nri_requests;
create policy nri_requests_insert on public.nri_requests for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);
drop policy if exists nri_requests_select on public.nri_requests;
create policy nri_requests_select on public.nri_requests for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());
drop policy if exists nri_requests_admin_update on public.nri_requests;
create policy nri_requests_admin_update on public.nri_requests for update to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());
grant insert, select on public.nri_requests to authenticated;
grant update on public.nri_requests to authenticated;

-- ── 6) Feature registry (admin-toggleable; display-only, gates nothing) ──────
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('my_tradition',       'My Tradition',            'Personalise dates, checklists & festivals to your faith — Hindu, Muslim, Christian, Sikh, Jain or none.', 'core',  'heart-circle', 160),
  ('qibla_direction',    'Qibla Direction',         'Exact Qibla bearing from any property''s location for prayer-room planning.',                             'buyer', 'compass', 161),
  ('blessing_scheduler', 'Blessing Scheduler',      'House-blessing dates & ceremony checklists for every tradition.',                                          'buyer', 'calendar', 162),
  ('sacred_places',      'Sacred Places Nearby',    'Temples, churches, mosques & gurdwaras near any property in one tap.',                                     'buyer', 'navigate', 163),
  ('nri_desk',           'NRI Desk',                'Gulf & overseas buyers: documents, POA, taxes, FX, payment plans and a dedicated helpline.',               'buyer', 'globe', 164),
  ('land_practicals',    'Land Practicality Checks','Water, soil, flood & access checks surfaced on plots.',                                                    'buyer', 'water', 165)
on conflict (key) do nothing;
