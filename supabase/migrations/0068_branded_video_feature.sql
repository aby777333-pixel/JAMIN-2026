-- JAMIN Properties — 0068 register the server-rendered branded-video feature.
-- ADDITIVE ONLY. Surfaces branded video in the admin Features catalog. Inert
-- until a Cloudinary account is set in app_secrets (cloudinary_cloud/_key/_secret).
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('branded_video', 'Branded Video Ads', 'Server-rendered videos with your branding overlaid (Cloudinary).', 'partner', 'videocam', 95)
on conflict (key) do nothing;
