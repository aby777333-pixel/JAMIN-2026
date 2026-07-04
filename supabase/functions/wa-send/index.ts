// JAMIN Properties — wa-send Edge Function (outbound WhatsApp via Meta Cloud API).
// Companion to wa-webhook (inbound → leads). Credentials live server-side only:
// app_secrets 'wa_token' (permanent access token) + 'wa_phone_id' (phone number
// id) — completely inert ({configured:false}) until both exist.
//
// Callers & auth (verify_jwt=false because the DB trigger has no JWT):
//   • DB trigger (new-lead alerts): body.secret === app_secrets 'wa_webhook_secret'
//   • Admin portal (status probe / test send): Authorization bearer of an ADMIN
//     user, verified via the auth_is_admin() RPC.
// Every attempted send is logged to public.wa_outbox for the admin WhatsApp tab.
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

async function secret(svc: ReturnType<typeof createClient>, key: string): Promise<string | undefined> {
  const { data } = await svc.from('app_secrets').select('value').eq('key', key).maybeSingle();
  const v = (data as { value?: string } | null)?.value;
  return v && String(v).trim() ? String(v).trim() : undefined;
}

/** Send one WhatsApp text message; logs the outcome. Returns ok/error. */
async function send(
  svc: ReturnType<typeof createClient>,
  token: string,
  phoneId: string,
  to: string,
  body: string,
  kind: string,
): Promise<{ ok: boolean; error?: string }> {
  const digits = to.replace(/[^\d]/g, '');
  let ok = false;
  let err: string | undefined;
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits,
        type: 'text',
        text: { body: body.slice(0, 3500) },
      }),
    });
    const d = await res.json().catch(() => ({}));
    ok = res.ok;
    if (!ok) err = d?.error?.message ?? `HTTP ${res.status}`;
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  try {
    await svc.from('wa_outbox').insert({
      to_phone: digits,
      body: body.slice(0, 2000),
      kind,
      status: ok ? 'sent' : 'failed',
      error: err ?? null,
    });
  } catch {
    /* logging is best-effort */
  }
  return { ok, error: err };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const input = await req.json().catch(() => ({}));
    const action = String(input.action ?? '');
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── auth: trigger secret OR admin JWT ──
    const hookSecret = await secret(svc, 'wa_webhook_secret');
    let trusted = !!hookSecret && input.secret === hookSecret;
    if (!trusted) {
      const asUser = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      });
      const { data: u } = await asUser.auth.getUser();
      if (u?.user) {
        const { data: isAdmin } = await asUser.rpc('auth_is_admin');
        trusted = isAdmin === true;
      }
    }
    if (!trusted) return json({ error: 'unauthorized' }, 401);

    const token = await secret(svc, 'wa_token');
    const phoneId = await secret(svc, 'wa_phone_id');
    const configured = !!token && !!phoneId;

    if (action === 'status') {
      return json({ configured, has_token: !!token, has_phone_id: !!phoneId });
    }

    if (!configured) {
      return json({
        configured: false,
        message: 'Outbound WhatsApp is not enabled yet — add wa_token and wa_phone_id to app_secrets.',
      });
    }

    if (action === 'test') {
      const to = String(input.to ?? '').trim();
      const body = String(input.body ?? '').trim() || 'Hello from JAMIN Properties 🏡 (test message)';
      if (!to) return json({ error: 'to (phone) required' }, 400);
      const r = await send(svc, token!, phoneId!, to, body, 'test');
      return json({ configured: true, sent: r.ok, error: r.error ?? null });
    }

    if (action === 'lead_alert') {
      const leadId = String(input.lead_id ?? '');
      if (!leadId) return json({ error: 'lead_id required' }, 400);
      const { data: lead } = await svc
        .from('leads')
        .select('id,source,contact, property:properties(plot_code)')
        .eq('id', leadId)
        .maybeSingle();
      if (!lead) return json({ skipped: 'lead not found' });
      const { data: cfgRow } = await svc.from('system_config').select('value').eq('key', 'wa_alerts').maybeSingle();
      const cfg = (cfgRow?.value ?? {}) as { enabled?: boolean; numbers?: string[] };
      const numbers = Array.isArray(cfg.numbers) ? cfg.numbers.filter(Boolean) : [];
      if (!cfg.enabled || numbers.length === 0) return json({ skipped: 'alerts disabled' });

      const c = (lead.contact ?? {}) as { name?: string; phone?: string; message?: string };
      const plot = (lead.property as { plot_code?: string } | null)?.plot_code;
      const msg =
        '🏡 New JAMIN lead\n' +
        `Name: ${c.name ?? '—'}\n` +
        (c.phone ? `Phone: ${c.phone}\n` : '') +
        `Source: ${lead.source ?? '—'}` +
        (plot ? `\nProperty: ${plot}` : '') +
        (c.message ? `\nMessage: ${String(c.message).slice(0, 200)}` : '') +
        '\nOpen the JAMIN admin → CRM to assign it.';
      let sent = 0;
      for (const to of numbers.slice(0, 5)) {
        const r = await send(svc, token!, phoneId!, String(to), msg, 'lead_alert');
        if (r.ok) sent++;
      }
      return json({ configured: true, sent });
    }

    return json({ error: `Unsupported action: ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
