-- JAMIN Properties — 0069 AI Suite admin module.
-- 1) Registers the new AI-suite features (voice call, Sarvam chat) and refreshes
--    the names of evolved ones (Property Studio, Live Camera Ad w/ video).
--    Registry-only: no flow is gated on these flags, so nothing can regress.
-- 2) admin_ai_key_status(): admin-only view of WHICH provider keys are configured
--    (never the values) so the web admin can show AI provider health.

-- ── 1) Feature registry ──────────────────────────────────────────────────────
insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('sarvam_chat',  'Sarvam AI Chat',  'Chat with the AI assistant in Indian languages (Sarvam).',            'ai', 'chatbubble-ellipses', 149),
  ('sarvam_voice', 'AI Voice Call',   'Speak with the AI assistant in Indian languages (mic → voice reply).', 'ai', 'call', 150)
on conflict (key) do nothing;

-- Evolved features — refresh display copy (safe: display-only registry).
update public.app_features set
  name = 'AI Property Studio',
  description = 'Transform a real photo of ANY property — add trees, gardens, pools, gates & more (plots, villas, farms, interiors).'
where key = 'virtual_stage';

update public.app_features set
  name = 'Live Camera Ad (Photo + Video)',
  description = 'Capture a live, geo-verified property photo or video on site and share it as a branded ad with your card.'
where key = 'photo_ad';

-- ── 2) Admin-only AI provider key status ─────────────────────────────────────
-- SECURITY DEFINER so it can read the service-role-only app_secrets table, but
-- it only ever reports EXISTENCE (configured true/false), never values.
create or replace function public.admin_ai_key_status()
returns table (provider text, secret_key text, configured boolean, last_updated timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_is_admin() then
    raise exception 'admin only';
  end if;
  return query
  select k.provider, k.secret_key,
         (s.key is not null and length(coalesce(s.value, '')) > 0) as configured,
         s.updated_at as last_updated
  from (values
    ('Anthropic (Claude text AI)',        'anthropic_api_key'),
    ('Replicate (images / staging)',      'replicate_api_token'),
    ('Sarvam (translate / chat / voice)', 'sarvam_api_key'),
    ('Cloudinary (branded video) — cloud','cloudinary_cloud'),
    ('Cloudinary (branded video) — key',  'cloudinary_key'),
    ('Cloudinary (branded video) — secret','cloudinary_secret')
  ) as k(provider, secret_key)
  left join public.app_secrets s on s.key = k.secret_key;
end;
$$;

revoke execute on function public.admin_ai_key_status() from public, anon;
grant execute on function public.admin_ai_key_status() to authenticated;
