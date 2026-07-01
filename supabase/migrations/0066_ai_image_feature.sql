-- JAMIN Properties — 0066 register the AI Image Generator feature.
-- ADDITIVE ONLY. Surfaces the new AI image-generation tool in the admin
-- Features catalog + the in-app "What's included" list.
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('ai_image_gen', 'AI Image Generator', 'Create flyer & banner images from a text prompt (Replicate google/imagen-4).', 'ai', 'sparkles', 145)
on conflict (key) do nothing;
