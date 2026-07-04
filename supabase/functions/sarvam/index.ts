// JAMIN Properties — sarvam Edge Function (Indian-language AI, modular).
// Wraps Sarvam AI: `translate` (sarvam-translate:v1), `chat` (sarvam-30b),
// `stt` (saarika:v2.5 speech-to-text) and `tts` (bulbul:v2 text-to-speech) —
// together these power the Sarvam chat + voice-call experience. The API key
// comes from the SARVAM_API_KEY env secret, falling back to the service-role-only
// public.app_secrets table (key 'sarvam_api_key'). Returns { configured:false }
// until a key exists, so the feature is completely inert until enabled.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ENV_KEY = Deno.env.get('SARVAM_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function resolveKey(): Promise<string | undefined> {
  if (ENV_KEY) return ENV_KEY;
  try {
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data } = await svc.from('app_secrets').select('value').eq('key', 'sarvam_api_key').maybeSingle();
    return (data as { value?: string } | null)?.value ?? undefined;
  } catch {
    return undefined;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await asUser.auth.getUser();
    if (!u?.user) return json({ error: 'unauthorized' }, 401);

    const { action, text, source, target, messages, language, audio_base64, mime, voice } =
      await req.json().catch(() => ({}));

    const key = await resolveKey();
    if (!key) {
      return json({
        configured: false,
        message: 'Sarvam AI is not enabled yet. Add a Sarvam API key to switch it on.',
      });
    }

    if (action === 'chat') {
      // Indian-language real-estate assistant via Sarvam chat completions.
      // `messages` = [{ role:'user'|'assistant', content }]; `language` (label)
      // nudges the reply language. Inert until a Sarvam key is set.
      const history = Array.isArray(messages) ? messages : [];
      const clean = history
        .filter((m: unknown): m is { role: string; content: string } =>
          !!m && typeof (m as { content?: unknown }).content === 'string')
        .slice(-16)
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content).slice(0, 4000),
        }));
      if (clean.length === 0) return json({ error: 'messages required' }, 400);

      const langLine = language && typeof language === 'string'
        ? ` Always reply in ${language} (use the Indian script for that language). Keep property/legal terms clear.`
        : ' Reply in the same language the user writes in.';
      const system = {
        role: 'system',
        content:
          'You are Jamindar, JAMIN Properties\' friendly real-estate assistant for Indian buyers, ' +
          'agents and partners. Help with property advice, locality guidance, pricing talk-tracks, ' +
          'home loans, Vastu basics, negotiation and documentation. Be concise, warm and practical. ' +
          'STANCE — always sales-positive and JAMIN-positive: speak of property ownership as a proud, ' +
          'wise step and of JAMIN Properties with warmth and confidence (verified listings, free site ' +
          'visits, escrow-protected bookings, expert team). Highlight opportunity and possibility; ' +
          'frame concerns as solvable with practical next steps, never discouragement. When relevant, ' +
          'gently suggest one easy next step through JAMIN — enquire on a listing, book a free site ' +
          'visit, talk to the JAMIN team. Never recommend competing platforms or brokers; all calls, ' +
          'visits and negotiations happen safely through JAMIN, so never suggest exchanging direct ' +
          'contact details. Stay honest: no invented listings, prices or guarantees of returns. ' +
          'Brand line: "Signature for Fortune."' + langLine,
      };

      // sarvam-m was deprecated (2026) → sarvam-30b. It's a reasoning model, so give
      // it token headroom: the visible reply lands in `content` after the reasoning.
      // Sarvam occasionally 5xxes or spends all tokens reasoning (empty content) —
      // retry once with more headroom, and NEVER surface an error bubble to the
      // user: a warm fallback reply beats "No reply from the model".
      async function complete(maxTokens: number): Promise<string> {
        try {
          const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'api-subscription-key': key!, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'sarvam-30b', messages: [system, ...clean], temperature: 0.5, max_tokens: maxTokens }),
          });
          const d = await res.json().catch(() => ({}));
          if (!res.ok) return '';
          const content = d?.choices?.[0]?.message?.content;
          return typeof content === 'string' ? content.trim() : '';
        } catch {
          return '';
        }
      }
      let reply = await complete(2048);
      if (!reply) reply = await complete(3072);
      if (!reply) {
        reply =
          'Namaste! 🙏 I had a small hiccup with that one — could you say it once more? ' +
          'I am right here to help with properties, localities, home loans, Vastu or anything JAMIN. 🏡';
      }

      // Log the turn so admins can monitor conversations (AI Conversations console).
      // Best-effort: a logging failure never breaks the chat.
      try {
        const svc = createClient(SUPABASE_URL, SERVICE_KEY);
        const lastUser = clean.filter((m) => m.role === 'user').pop();
        await svc.from('ai_generations').insert({
          user_id: u.user.id,
          feature: 'sarvam_chat',
          input: { language: language ?? null, message: (lastUser?.content ?? '').slice(0, 2000), turns: clean.length },
          output: reply.trim().slice(0, 4000),
          meta: { model: 'sarvam-30b' },
          status: 'done',
        });
      } catch {
        /* ignore */
      }
      return json({ configured: true, text: reply.trim() });
    }

    if (action === 'stt') {
      // Speech-to-text (saarika:v2.5) — base64 audio in, transcript out. Auto-detects
      // the spoken Indian language; returns the detected code too.
      if (!audio_base64 || typeof audio_base64 !== 'string') {
        return json({ error: 'audio_base64 required' }, 400);
      }
      const bin = Uint8Array.from(atob(audio_base64), (c) => c.charCodeAt(0));
      const form = new FormData();
      // Sarvam rejects 'audio/m4a' but accepts 'audio/mp4' / 'audio/x-m4a' — expo-audio
      // recordings are AAC in an MP4 container, so normalize the label.
      let kind = typeof mime === 'string' && mime ? mime.toLowerCase() : 'audio/wav';
      if (kind === 'audio/m4a' || kind === 'audio/aac-m4a') kind = 'audio/mp4';
      if (kind === 'audio/3gpp' || kind === 'audio/3gp') kind = 'audio/mp4';
      const ext = kind.includes('mp4') || kind.includes('m4a') ? 'm4a' : kind.includes('mpeg') || kind.includes('mp3') ? 'mp3' : 'wav';
      form.append('file', new Blob([bin], { type: kind }), `speech.${ext}`);
      form.append('model', 'saarika:v2.5');

      const res = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: { 'api-subscription-key': key },
        body: form,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: d?.error?.message ?? d?.message ?? 'Transcription failed', detail: d }, 502);

      // Log the voice turn (transcript only, never audio) for the admin console.
      try {
        const svc = createClient(SUPABASE_URL, SERVICE_KEY);
        await svc.from('ai_generations').insert({
          user_id: u.user.id,
          feature: 'sarvam_voice',
          input: { detected_language: d?.language_code ?? null },
          output: String(d?.transcript ?? '').slice(0, 4000),
          meta: { model: 'saarika:v2.5' },
          status: 'done',
        });
      } catch {
        /* ignore */
      }
      return json({ configured: true, text: d?.transcript ?? '', language_code: d?.language_code ?? null });
    }

    if (action === 'tts') {
      // Text-to-speech (bulbul:v2) — returns base64 WAV audio for playback.
      if (!text || typeof text !== 'string' || !target) {
        return json({ error: 'text and target language are required.' }, 400);
      }
      const res = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 1500),
          target_language_code: target,
          model: 'bulbul:v2',
          speaker: typeof voice === 'string' && voice ? voice : 'anushka',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: d?.error?.message ?? d?.message ?? 'Speech synthesis failed', detail: d }, 502);
      const audio = Array.isArray(d?.audios) ? d.audios[0] : undefined;
      if (!audio) return json({ error: 'No audio returned by the model.' }, 502);
      return json({ configured: true, audio_base64: audio, mime: 'audio/wav' });
    }

    if (action === 'translate') {
      if (!text || typeof text !== 'string' || !target) {
        return json({ error: 'text and target language are required.' }, 400);
      }
      const H = { 'api-subscription-key': key, 'Content-Type': 'application/json' };
      // sarvam-translate:v1 covers all 22 scheduled Indian languages but needs a real
      // source code (no 'auto'), so detect it via Sarvam's LID when unspecified.
      let src = source && source !== 'auto' ? source : '';
      if (!src) {
        try {
          const lid = await fetch('https://api.sarvam.ai/text-lid', {
            method: 'POST',
            headers: H,
            body: JSON.stringify({ input: text.slice(0, 500) }),
          });
          const ld = await lid.json().catch(() => ({}));
          src = typeof ld?.language_code === 'string' && ld.language_code.includes('-') ? ld.language_code : 'en-IN';
        } catch {
          src = 'en-IN';
        }
      }
      // Same source & target — nothing to translate.
      if (src === target) return json({ configured: true, text });

      const res = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: H,
        body: JSON.stringify({
          input: text.slice(0, 2000),
          source_language_code: src,
          target_language_code: target,
          model: 'sarvam-translate:v1',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: d?.error?.message ?? d?.message ?? 'Translation failed', detail: d }, 502);
      return json({ configured: true, text: d?.translated_text ?? '' });
    }

    return json({ error: `Unsupported action: ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
