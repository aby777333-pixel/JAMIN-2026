-- JAMIN Properties — 0064 investment/cultural features + gold rate.
-- ADDITIVE ONLY. Registers the new Indian-mindset features in the app_features
-- catalog (admin can toggle/reorder; they also show in the in-app catalog) and
-- seeds the admin-editable gold rate used for gold-equivalent property values.

insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('gold_value',     'Gold-Equivalent Value',   'Each plot''s price shown in gold sovereigns/grams — the Indian investor''s benchmark.', 'buyer', 'cash', 235),
  ('vastu_score',    'Vastu Compliance Score',  'A positive 0–100 Vastu score per plot from facing & layout.', 'buyer', 'compass', 240),
  ('shagun',         'Shagun Token Amounts',    'Auspicious booking/token amounts ending in ₹1.', 'buyer', 'gift', 245),
  ('expert_consult', 'Talk to an Expert',       'One-tap Vastu / astrology / investment consultation request (into CRM leads).', 'buyer', 'chatbubble-ellipses', 250)
on conflict (key) do nothing;

-- Admin-editable gold rate (₹/gram, 24k). Shown in the admin "System config" tab.
insert into public.system_config (key, value) values ('gold_rate_per_gram', '7500'::jsonb)
on conflict (key) do nothing;
