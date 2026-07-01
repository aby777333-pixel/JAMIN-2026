// JAMIN Properties — video-brand Edge Function (server-rendered branded video).
// TRUE on-video overlay isn't possible in Deno/Netlify (no ffmpeg), so this
// delegates to a video-processing service. Implemented for Cloudinary (free tier,
// supports image-overlay-on-video). Creds come from the service-role-only
// public.app_secrets table (keys: cloudinary_cloud, cloudinary_key,
// cloudinary_secret) or env. Returns { configured:false } until keyed — completely
// inert (no effect on the app) until enabled.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function secret(key: string, envName: string): Promise<string | undefined> {
  const env = Deno.env.get(envName);
  if (env) return env;
  try {
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data } = await svc.from('app_secrets').select('value').eq('key', key).maybeSingle();
    return (data as { value?: string } | null)?.value ?? undefined;
  } catch {
    return undefined;
  }
}

async function sha1hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// base64url without padding — Cloudinary l_fetch expects a base64 remote URL.
function b64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await asUser.auth.getUser();
    if (!u?.user) return json({ error: 'unauthorized' }, 401);

    const { videoUrl, overlayUrl } = await req.json().catch(() => ({}));

    const [cloud, apiKey, apiSecret] = await Promise.all([
      secret('cloudinary_cloud', 'CLOUDINARY_CLOUD'),
      secret('cloudinary_key', 'CLOUDINARY_KEY'),
      secret('cloudinary_secret', 'CLOUDINARY_SECRET'),
    ]);
    if (!cloud || !apiKey || !apiSecret) {
      return json({
        configured: false,
        message:
          'Branded video is not enabled yet. Add a Cloudinary account (cloudinary_cloud / _key / _secret).',
      });
    }
    if (!videoUrl || !overlayUrl) return json({ error: 'videoUrl and overlayUrl are required.' }, 400);

    // Overlay the branded PNG (fetched remotely) full-width at the bottom of the video.
    const eager = `l_fetch:${b64url(overlayUrl)},fl_relative,w_1.0,fl_layer_apply,g_south`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // Cloudinary signature: sha1 of sorted "key=value" params (excluding file/api_key/signature) + secret.
    const signature = await sha1hex(`eager=${eager}&timestamp=${timestamp}${apiSecret}`);

    const form = new URLSearchParams({
      file: videoUrl,
      api_key: apiKey,
      timestamp,
      eager,
      signature,
    });
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/video/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: d?.error?.message ?? 'Video render failed', detail: d }, 502);
    const url = d?.eager?.[0]?.secure_url ?? d?.secure_url;
    if (!url) return json({ error: 'No rendered video returned.', detail: d }, 502);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    await svc
      .from('ai_generations')
      .insert({ user_id: u.user.id, feature: 'video_brand', input: { provider: 'cloudinary' }, output: url, status: 'done' })
      .then(() => {}, () => {});

    return json({ configured: true, url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
