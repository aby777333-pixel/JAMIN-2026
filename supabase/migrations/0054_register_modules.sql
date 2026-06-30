-- JAMIN Properties — 0054 register every shipped v2 module in the feature registry.
-- Gives each module an admin-visible, toggleable presence in web admin → Features
-- (and the in-app "What's included" catalog). Additive, idempotent (on conflict do
-- nothing); no flow is gated on these flags, so nothing can regress.

insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('deal_pipeline',     'Deal Pipeline (CRM)',     'Kanban lead pipeline with stage analytics and deal value.', 'partner', 'git-branch', 55),
  ('lead_scoring',      'Smart Lead Scoring',      'Explainable hot/warm/cold scoring plus AI assist.',          'ai',      'flame', 56),
  ('property_radar',    'Saved-Search Alerts',     'New-listing and price-drop alerts for buyer requirements.',  'buyer',   'notifications', 41),
  ('site_visits',       'Site Visits & Check-in',  'Visit booking with geofenced attendance + agent calendar.',  'buyer',   'calendar', 42),
  ('rera',              'RERA Verification',       'Registered / pending / expired RERA badges on listings.',    'admin',   'shield-checkmark', 36),
  ('price_history',     'Price History',           'Every listing price change logged and shown to buyers.',     'buyer',   'trending-down', 43),
  ('reviews',           'Reviews & Ratings',       'Verified project reviews with star ratings.',                'buyer',   'star', 44),
  ('calculators',       'Cost Calculators',        'EMI, ROI, stamp duty, affordability and rent-vs-buy.',       'buyer',   'calculator', 45),
  ('shortlists',        'Shared Shortlists',       'Collaborate with family — add, vote and comment.',           'buyer',   'people-circle', 46),
  ('neighborhood',      'Neighborhood Scores',     'Liveability scorecards (schools, healthcare, safety…).',     'buyer',   'map', 47),
  ('personalized_feed', 'Personalized Feed',       '"For you" recommendations from your activity.',              'buyer',   'heart', 48),
  ('cobroking',         'Co-broking Marketplace',  'Share inventory with other agents and split commission.',    'partner', 'git-network', 65),
  ('lead_routing',      'Lead Auto-routing',       'Round-robin lead assignment over a configurable pool.',      'admin',   'shuffle', 66),
  ('payout_statement',  'Commission Statements',   'Downloadable TDS-ready commission payout PDF.',              'partner', 'document', 67),
  ('builder_inventory', 'Builder Inventory',       'Available / reserved / sold rollup for your listings.',      'partner', 'business', 68),
  ('agent_pages',       'Agent Public Pages',      'Shareable /a/<code> landing page of your live listings.',    'partner', 'globe', 69),
  ('poster_maker',      'Poster / Banner Maker',   'Photo or video + details → branded, shareable ad.',          'partner', 'image', 92),
  ('ai_property',       'AI Property Tools',        'Per-listing Q&A, fair-price estimate and translation.',     'ai',      'sparkles', 141),
  ('market_insights',   'Market Insights',         'Locality trends, investment hotspots and leaderboards.',     'partner', 'trending-up', 155)
on conflict (key) do nothing;
