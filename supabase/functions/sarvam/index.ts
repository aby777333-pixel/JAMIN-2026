// JAMIN Properties — sarvam Edge Function (Indian-language AI, modular).
// Wraps Sarvam AI. Currently implements `translate`; structured so tts / stt /
// chat can be added later. The API key comes from the SARVAM_API_KEY env secret,
// falling back to the service-role-only public.app_secrets table (key
// 'sarvam_api_key'). Returns { configured:false } until a key exists, so the
// feature is completely inert (no effect on the app) until enabled.
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

    const { action, text, source, target, messages, language } = await req.json().catch(() => ({}));

    const key = await resolveKey();
    if (!key) {
      return json({
        configured: false,
        message: 'Sarvam AI is not enabled yet. Add a Sarvam API key to switch it on.',
      });
    }

    if (action === 'chat') {
      // Indian-language real-estate assistant via Sarvam-M chat completions.
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
          "You are JAMIN Properties' friendly real-estate assistant for Indian buyers, agents and " +
          'partners. Help with property advice, locality guidance, pricing talk-tracks, home loans, ' +
          'Vastu basics, negotiation and documentation. Be concise, warm and practical. Brand line: ' +
          '"Signature for Fortune."' + langLine,
      };

      const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'sarvam-m', messages: [system, ...clean], temperature: 0.5, max_tokens: 700 }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: d?.error?.message ?? d?.message ?? 'Chat failed', detail: d }, 502);
      const reply = d?.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) return json({ error: 'No reply from the model.' }, 502);
      return json({ configured: true, text: reply.trim() });
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
