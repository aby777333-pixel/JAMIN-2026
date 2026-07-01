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

    const { action, text, source, target } = await req.json().catch(() => ({}));

    const key = await resolveKey();
    if (!key) {
      return json({
        configured: false,
        message: 'Sarvam AI is not enabled yet. Add a Sarvam API key to switch it on.',
      });
    }

    if (action === 'translate') {
      if (!text || typeof text !== 'string' || !target) {
        return json({ error: 'text and target language are required.' }, 400);
      }
      const res = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text.slice(0, 2000),
          source_language_code: source || 'auto',
          target_language_code: target,
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
