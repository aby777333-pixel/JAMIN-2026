// JAMIN Properties — ai-image Edge Function (AI image generation).
// Text-to-image via Replicate google/imagen-4, for creative flyer/banner
// backgrounds & marketing visuals. Token from the REPLICATE_API_TOKEN env
// secret, falling back to the service-role-only public.app_secrets table
// (key 'replicate_api_token'). Returns { configured:false } until a token exists.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ENV_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
const MODEL = Deno.env.get('IMAGE_GEN_MODEL') ?? 'google/imagen-4';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const ASPECTS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await asUser.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { prompt, aspect_ratio } = await req.json().catch(() => ({}));
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return json({ error: 'A prompt of at least 3 characters is required.' }, 400);
    }
    const aspect = ASPECTS.has(aspect_ratio) ? aspect_ratio : '4:3';

    // Token: env secret first, then the service-role-only app_secrets fallback.
    let token = ENV_TOKEN;
    if (!token) {
      try {
        const svc0 = createClient(SUPABASE_URL, SERVICE_KEY);
        const { data: sec } = await svc0
          .from('app_secrets')
          .select('value')
          .eq('key', 'replicate_api_token')
          .maybeSingle();
        token = (sec as { value?: string } | null)?.value ?? undefined;
      } catch {
        /* ignore — treated as unconfigured below */
      }
    }
    if (!token) {
      return json({
        configured: false,
        message: 'AI image generation is not enabled yet. Add a Replicate token to switch it on.',
      });
    }

    const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
      },
      body: JSON.stringify({
        input: {
          prompt: prompt.trim().slice(0, 1500),
          aspect_ratio: aspect,
          output_format: 'jpg',
          safety_filter_level: 'block_medium_and_above',
        },
      }),
    });
    const pred = await res.json();
    if (!res.ok) return json({ error: pred?.detail ?? 'Generation failed', detail: pred }, 502);
    if (pred.status !== 'succeeded') {
      return json({ error: 'Still generating — please try again.', status: pred.status }, 202);
    }
    const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!out) return json({ error: 'No image returned by the model.' }, 502);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    await svc
      .from('ai_generations')
      .insert({ user_id: user.id, feature: 'image_gen', input: { model: MODEL, aspect }, output: out, status: 'done' })
      .then(() => {}, () => {});

    return json({ configured: true, url: out });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
