// JAMIN Properties — email-send Edge Function (bulk CSV smart emailer).
// Sends via Resend using app_secrets 'resend_api_key' (+ optional 'email_from',
// default onboarding@resend.dev for testing) — completely inert until the key
// exists. ADMIN-ONLY: callers must present an admin JWT (auth_is_admin RPC).
// {{name}} in subject/html is personalised per recipient. Every send is logged
// to public.email_outbox for the admin Campaigns tab.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const input = await req.json().catch(() => ({}));
    const action = String(input.action ?? '');
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── admin-only auth ──
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await asUser.auth.getUser();
    let isAdmin = false;
    if (u?.user) {
      const { data } = await asUser.rpc('auth_is_admin');
      isAdmin = data === true;
    }
    if (!isAdmin) return json({ error: 'unauthorized' }, 401);

    const { data: keyRow } = await svc.from('app_secrets').select('value').eq('key', 'resend_api_key').maybeSingle();
    const apiKey = (keyRow as { value?: string } | null)?.value?.trim() || undefined;
    const { data: fromRow } = await svc.from('app_secrets').select('value').eq('key', 'email_from').maybeSingle();
    const from = (fromRow as { value?: string } | null)?.value?.trim() || 'JAMIN Properties <onboarding@resend.dev>';

    if (action === 'status') {
      return json({ configured: !!apiKey, from });
    }
    if (!apiKey) {
      return json({ configured: false, message: 'Emailer is not enabled yet — add resend_api_key to app_secrets.' });
    }

    if (action === 'send') {
      const subject = String(input.subject ?? '').trim();
      const html = String(input.html ?? '').trim();
      const list = Array.isArray(input.recipients) ? input.recipients : [];
      if (!subject || !html) return json({ error: 'subject and html required' }, 400);
      if (list.length === 0) return json({ error: 'recipients required' }, 400);
      if (list.length > 100) return json({ error: 'max 100 recipients per call — send in batches' }, 400);
      // CC/BCC ride on EVERY outgoing message (max 5 each — Resend caps 50 total).
      const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
      const cc = (Array.isArray(input.cc) ? input.cc : []).map((e: unknown) => String(e).trim()).filter(emailOk).slice(0, 5);
      const bcc = (Array.isArray(input.bcc) ? input.bcc : []).map((e: unknown) => String(e).trim()).filter(emailOk).slice(0, 5);

      let sent = 0;
      let failed = 0;
      for (const r of list) {
        const email = String(r?.email ?? '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          failed++;
          continue;
        }
        const name = String(r?.name ?? '').trim() || 'there';
        const pSubject = subject.replaceAll('{{name}}', name);
        const pHtml = html.replaceAll('{{name}}', name);
        let ok = false;
        let err: string | undefined;
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from,
              to: [email],
              subject: pSubject,
              html: pHtml,
              ...(cc.length ? { cc } : {}),
              ...(bcc.length ? { bcc } : {}),
            }),
          });
          const d = await res.json().catch(() => ({}));
          ok = res.ok;
          if (!ok) err = d?.message ?? `HTTP ${res.status}`;
        } catch (e) {
          err = e instanceof Error ? e.message : String(e);
        }
        try {
          await svc.from('email_outbox').insert({
            to_email: email,
            subject: pSubject.slice(0, 300),
            kind: String(input.kind ?? 'campaign'),
            status: ok ? 'sent' : 'failed',
            error: err ?? null,
          });
        } catch {
          /* best-effort log */
        }
        if (ok) sent++;
        else failed++;
      }
      return json({ configured: true, sent, failed });
    }

    return json({ error: `Unsupported action: ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
