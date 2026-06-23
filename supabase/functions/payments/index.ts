// JAMIN Properties — payments Edge Function (§4 booking payments + tracking, §10 payouts).
// Server-side Razorpay Payment Links (no native SDK needed in the app). The app calls
// `create_link` to get a hosted checkout URL, opens it, then calls `sync` to reconcile.
// Keys live ONLY here (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). Until they're set the
// function returns { configured: false } so the app shows a friendly message.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://wonderful-cupcake-0d3074.netlify.app';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function rzpAuth() {
  return 'Basic ' + btoa(`${KEY_ID}:${KEY_SECRET}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    // Identify the caller from their JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await asUser.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { action, booking_id, payment_id } = await req.json().catch(() => ({}));

    const configured = !!(KEY_ID && KEY_SECRET);

    // ── create a payment link for a booking ────────────────────────────
    if (action === 'create_link') {
      if (!booking_id) return json({ error: 'booking_id required' }, 400);

      const { data: booking } = await svc
        .from('bookings')
        .select('id, amount, status, buyer_id, property_id')
        .eq('id', booking_id)
        .maybeSingle();
      if (!booking) return json({ error: 'booking not found' }, 404);

      // Authorize: only the buyer (or an admin) can pay for a booking.
      const { data: me } = await svc
        .from('profiles')
        .select('id, full_name, phone, email, role:roles(is_admin)')
        .eq('id', user.id)
        .maybeSingle();
      const isAdmin = (me?.role as { is_admin?: boolean } | null)?.is_admin === true;
      if (booking.buyer_id !== user.id && !isAdmin) return json({ error: 'forbidden' }, 403);

      const amount = Number(booking.amount || 0);
      if (amount <= 0) return json({ error: 'Booking has no payable amount yet.' }, 400);

      if (!configured) {
        return json({
          configured: false,
          message: 'Online payments are not enabled yet. Please contact the JAMIN team to complete your booking.',
        });
      }

      const { data: prop } = await svc
        .from('properties')
        .select('plot_code')
        .eq('id', booking.property_id)
        .maybeSingle();

      const rzpRes = await fetch('https://api.razorpay.com/v1/payment_links', {
        method: 'POST',
        headers: { Authorization: rzpAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: 'INR',
          accept_partial: false,
          description: `JAMIN Properties — booking ${prop?.plot_code ?? ''}`.trim(),
          customer: {
            name: me?.full_name ?? 'JAMIN Buyer',
            contact: me?.phone ?? undefined,
            email: me?.email ?? undefined,
          },
          notify: { sms: !!me?.phone, email: !!me?.email },
          reminder_enable: true,
          notes: { booking_id: booking.id, purpose: 'booking' },
          callback_url: `${SITE_URL}/?paid=1`,
          callback_method: 'get',
        }),
      });
      const link = await rzpRes.json();
      if (!rzpRes.ok) return json({ error: link?.error?.description ?? 'Gateway error', detail: link }, 502);

      const { data: pay, error: payErr } = await svc
        .from('payments')
        .insert({
          booking_id: booking.id,
          amount,
          status: 'created',
          method: 'razorpay',
          gateway: 'razorpay',
          gateway_ref: link.id,
          short_url: link.short_url,
          purpose: 'booking',
        })
        .select('id')
        .single();
      if (payErr) return json({ error: payErr.message }, 500);

      return json({ configured: true, payment_id: pay.id, short_url: link.short_url, gateway_ref: link.id });
    }

    // ── reconcile a payment's status from Razorpay ─────────────────────
    if (action === 'sync') {
      // Sync one payment, or all payments on a booking.
      let q = svc.from('payments').select('id, booking_id, gateway_ref, status').eq('gateway', 'razorpay');
      if (payment_id) q = q.eq('id', payment_id);
      else if (booking_id) q = q.eq('booking_id', booking_id);
      else return json({ error: 'payment_id or booking_id required' }, 400);
      const { data: pays } = await q;
      if (!configured) return json({ configured: false, updated: 0 });

      let updated = 0;
      for (const p of pays ?? []) {
        if (p.status === 'paid' || !p.gateway_ref) continue;
        const r = await fetch(`https://api.razorpay.com/v1/payment_links/${p.gateway_ref}`, {
          headers: { Authorization: rzpAuth() },
        });
        const link = await r.json();
        if (!r.ok) continue;
        if (link.status === 'paid') {
          const paymentId = Array.isArray(link.payments) && link.payments[0]?.payment_id;
          await svc
            .from('payments')
            .update({ status: 'paid', gateway_payment_id: paymentId ?? null })
            .eq('id', p.id);
          await svc.from('bookings').update({ status: 'paid' }).eq('id', p.booking_id);
          updated++;
        } else if (link.status === 'cancelled' || link.status === 'expired') {
          await svc.from('payments').update({ status: link.status }).eq('id', p.id);
        }
      }
      return json({ configured: true, updated });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
