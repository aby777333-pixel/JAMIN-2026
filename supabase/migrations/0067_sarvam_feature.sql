-- JAMIN Properties — 0067 register the Sarvam AI translate feature.
-- ADDITIVE ONLY. Surfaces the Indian-language translation tool in the admin
-- Features catalog + the in-app "What's included" list. Inert until a Sarvam key
-- is set in app_secrets (key 'sarvam_api_key').
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('sarvam_translate', 'Indian-language Translate', 'Translate text into Hindi, Tamil, Telugu, Kannada, Malayalam & more (Sarvam AI).', 'ai', 'language', 148)
on conflict (key) do nothing;
