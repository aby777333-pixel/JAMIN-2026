// JAMIN Properties — image-enhance Edge Function (§14 AI Photo Enhancement).
// Server-side image upscaler/enhancer via Replicate. The key lives only here
// (REPLICATE_API_TOKEN); until it's set the function returns { configured:false }.
// Default model: nightmareai/real-esrgan (override with REPLICATE_MODEL).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
const MODEL = Deno.env.get('REPLICATE_MODEL') ?? 'nightmareai/real-esrgan';
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

    const { image_base64, mime } = await req.json().catch(() => ({}));
    if (!image_base64) return json({ error: 'image_base64 required' }, 400);

    if (!TOKEN) {
      return json({
        configured: false,
        message: 'AI photo enhancement is not enabled yet. Add a Replicate token to switch it on.',
      });
    }

    const dataUri = `data:${mime || 'image/jpeg'};base64,${image_base64}`;
    const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=55',
      },
      body: JSON.stringify({ input: { image: dataUri, scale: 2, face_enhance: false } }),
    });
    const pred = await res.json();
    if (!res.ok) return json({ error: pred?.detail ?? 'Enhancement failed', detail: pred }, 502);
    if (pred.status !== 'succeeded') {
      return json({ error: 'Enhancement is still processing — please try again.', status: pred.status }, 202);
    }
    const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!out) return json({ error: 'No image returned by the model.' }, 502);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    await svc
      .from('ai_generations')
      .insert({ user_id: user.id, feature: 'photo_enhance', input: { model: MODEL }, output: out, status: 'done' })
      .then(() => {}, () => {});

    return json({ configured: true, url: out });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
