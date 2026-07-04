-- JAMIN Properties — 0080 rebrand the in-app AI assistant to "Jamindar".
-- Display-only: updates app_features name/description copy. Feature KEYS
-- (sarvam_chat / sarvam_voice / sarvam_translate), the sarvam Edge Function,
-- and the sarvam_api_key secret are all unchanged — no flow is gated on the
-- display text, so nothing can regress.

update public.app_features set
  name = 'Jamindar AI Chat',
  description = 'Chat with Jamindar, the AI assistant, in Indian languages.'
where key = 'sarvam_chat';

update public.app_features set
  description = 'Translate text into Hindi, Tamil, Telugu, Kannada, Malayalam & more (Jamindar AI).'
where key = 'sarvam_translate';
