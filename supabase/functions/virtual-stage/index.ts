// JAMIN Properties — virtual-stage Edge Function (AI Property Studio).
// Image-to-image editing: takes a REAL property photo + an instruction and
// realistically adds creative elements / develops / landscapes / furnishes it.
// Works for every property type (empty plot, villa, apartment, house, farmhouse,
// farmland, estate, gated community, commercial land, interior room) — not just
// rooms. Powered by Replicate's instruction image-editing model (default
// black-forest-labs/flux-kontext-pro, override with STAGING_MODEL).
//
// Token: REPLICATE_API_TOKEN env secret first, then the service-role-only
// public.app_secrets table (key 'replicate_api_token'). Returns
// { configured:false } until a token exists, so the feature is completely inert
// (no effect on the app) until enabled — same contract as ai-image/image-enhance.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ENV_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
const MODEL = Deno.env.get('STAGING_MODEL') ?? 'black-forest-labs/flux-kontext-pro';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await asUser.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { image_base64, prompt, mime } = await req.json().catch(() => ({}));
    if (!image_base64) return json({ error: 'image_base64 required' }, 400);
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return json({ error: 'A prompt describing the transformation is required.' }, 400);
    }

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
        message: 'AI Property Studio is not enabled yet. Add a Replicate token to switch it on.',
      });
    }

    const dataUri = `data:${mime || 'image/jpeg'};base64,${image_base64}`;
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
          input_image: dataUri,
          aspect_ratio: 'match_input_image',
          output_format: 'jpg',
          safety_tolerance: 2,
        },
      }),
    });
    const pred = await res.json();
    if (!res.ok) return json({ error: pred?.detail ?? 'Staging failed', detail: pred }, 502);
    if (pred.status !== 'succeeded') {
      return json({ configured: true, pending: true, error: 'Still rendering — please try again.', status: pred.status }, 202);
    }
    const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!out) return json({ error: 'No image returned by the model.' }, 502);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    await svc
      .from('ai_generations')
      .insert({ user_id: user.id, feature: 'virtual_stage', input: { model: MODEL }, output: out, status: 'done' })
      .then(() => {}, () => {});

    return json({ configured: true, url: out });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
