// JAMIN Properties — push-send Edge Function (§11).
// Sends an Expo push to all of a user's registered devices. Called by the app
// (admin "notify") or a future DB trigger. In-app delivery is handled by Realtime.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { user_id, title, body, data } = await req.json();
    if (!user_id) return json({ error: 'user_id required' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id);

    const messages = (tokens ?? []).map((t: { token: string }) => ({
      to: t.token,
      title: title ?? 'JAMIN Properties',
      body: body ?? '',
      data: data ?? {},
      sound: 'default',
    }));
    if (messages.length === 0) return json({ sent: 0 });

    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await resp.json();
    return json({ sent: messages.length, result });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
