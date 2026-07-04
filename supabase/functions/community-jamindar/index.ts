// JAMIN Properties — community-jamindar Edge Function.
// Called by the DB trigger (pg_net) whenever a community post is created:
// Jamindar writes ONE helpful, sales-positive, JAMIN-positive reply comment in
// the post's own language. Authenticated by the generated webhook secret in
// app_secrets ('jamindar_webhook_secret') — NOT by user JWT (verify_jwt=false),
// since the caller is the database itself. Inert without a Sarvam key.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ENV_SARVAM = Deno.env.get('SARVAM_API_KEY');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LANG_LABEL: Record<string, string> = {
  en: 'English', hi: 'Hindi (हिन्दी)', ta: 'Tamil (தமிழ்)', te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)', ml: 'Malayalam (മലയാളം)', mr: 'Marathi (मराठी)',
  bn: 'Bengali (বাংলা)', gu: 'Gujarati (ગુજરાતી)', ur: 'Urdu (اردو)',
};

Deno.serve(async (req) => {
  try {
    const { post_id, secret } = await req.json().catch(() => ({}));
    if (!post_id || !secret) return json({ error: 'post_id and secret required' }, 400);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authenticate the webhook (the DB trigger sends the generated secret).
    const { data: sec } = await svc
      .from('app_secrets').select('value').eq('key', 'jamindar_webhook_secret').maybeSingle();
    if (!sec?.value || sec.value !== secret) return json({ error: 'unauthorized' }, 401);

    // Load the post; skip anything unfit for a reply.
    const { data: post } = await svc
      .from('community_posts')
      .select('id,author_name,body,lang,status')
      .eq('id', post_id)
      .maybeSingle();
    if (!post || post.status !== 'published' || !post.body || post.body.trim().length < 8) {
      return json({ skipped: 'no reply needed' });
    }

    // One Jamindar reply per post, ever.
    const { count } = await svc
      .from('community_comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post_id)
      .eq('is_ai', true);
    if ((count ?? 0) > 0) return json({ skipped: 'already replied' });

    // Sarvam key (env → app_secrets fallback, same pattern as the sarvam fn).
    let key = ENV_SARVAM;
    if (!key) {
      const { data } = await svc.from('app_secrets').select('value').eq('key', 'sarvam_api_key').maybeSingle();
      key = (data as { value?: string } | null)?.value ?? undefined;
    }
    if (!key) return json({ skipped: 'sarvam not configured' });

    const firstName = String(post.author_name ?? '').trim().split(/\s+/)[0] || 'friend';
    const langLabel = LANG_LABEL[String(post.lang ?? 'en')] ?? 'the same language as the post';
    const system = {
      role: 'system',
      content:
        "You are Jamindar, JAMIN Properties' friendly AI assistant, replying inside the JAMIN " +
        'community feed. Write ONE short reply (maximum 60 words) to the community post below. ' +
        `Reply in ${langLabel}. Address ${firstName} warmly by name. Be helpful and specific to ` +
        'what they wrote. STANCE — always sales-positive and JAMIN-positive: property ownership ' +
        'is a proud, wise step; JAMIN offers verified listings, free site visits and escrow-' +
        'protected bookings. If relevant, suggest one easy next step in the JAMIN app (browse ' +
        'listings, book a free site visit, ask me in Jamindar chat). Never share or request phone ' +
        'numbers or direct contact details — contact happens safely through JAMIN. No hashtags, ' +
        'no signature. Stay honest: never invent specific listings, prices or returns.',
    };
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sarvam-30b',
        messages: [system, { role: 'user', content: String(post.body).slice(0, 2000) }],
        temperature: 0.6,
        // Reasoning model: the visible reply lands in `content` AFTER the internal
        // reasoning, so it needs generous headroom (same as the sarvam chat fn).
        max_tokens: 2048,
      }),
    });
    const d = await res.json().catch(() => ({}));
    const reply = d?.choices?.[0]?.message?.content;
    if (!res.ok || typeof reply !== 'string' || !reply.trim()) {
      return json({ skipped: 'no model reply', detail: d?.error?.message ?? d?.message ?? null }, 200);
    }

    const { error } = await svc.from('community_comments').insert({
      post_id,
      author_id: null,
      author_name: 'Jamindar · JAMIN AI',
      body: reply.trim().slice(0, 1200),
      lang: post.lang ?? 'en',
      is_ai: true,
    });
    if (error) return json({ error: error.message }, 500);

    // Surface the turn in the admin AI Conversations console (best-effort).
    try {
      await svc.from('ai_generations').insert({
        user_id: null,
        feature: 'sarvam_chat',
        input: { source: 'community', post_id, message: String(post.body).slice(0, 2000) },
        output: reply.trim().slice(0, 4000),
        meta: { model: 'sarvam-30b', surface: 'community_reply' },
        status: 'done',
      });
    } catch {
      /* ignore */
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
