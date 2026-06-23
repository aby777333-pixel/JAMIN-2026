// JAMIN Properties — ai-generate Edge Function (§5.14, §9-10).
// The ONLY place Claude is called. The app never talks to Anthropic directly;
// ANTHROPIC_API_KEY lives only in this function's env. Default model is
// claude-opus-4-8 (override with AI_MODEL). Results are logged to ai_generations.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-opus-4-8';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BRAND_SYSTEM =
  "You are JAMIN Properties' AI marketing assistant for an Indian real-estate sales platform. " +
  'Brand line: "Signature for Fortune." Write clear, professional, persuasive, publish-ready ' +
  'English for Indian buyers; prices in INR with Indian digit grouping. No preamble, no meta-commentary.';

type Spec = {
  system?: string;
  prompt?: string;
  // deno-lint-ignore no-explicit-any
  messages?: any[];
  maxTokens?: number;
  json?: boolean;
};

// deno-lint-ignore no-explicit-any
const ctx = (i: any) =>
  [
    i.project && `Project: ${i.project}`,
    i.propertyType && `Type: ${i.propertyType}`,
    i.location && `Location: ${i.location}`,
    i.price && `Price: ₹${i.price}`,
    i.features && `Highlights: ${i.features}`,
    i.context && `Context: ${i.context}`,
  ]
    .filter(Boolean)
    .join('\n');

// deno-lint-ignore no-explicit-any
const PROMPTS: Record<string, (i: any) => Spec> = {
  description: (i) => ({
    system: BRAND_SYSTEM,
    prompt: `Write an appealing property listing description (90-130 words).\n${ctx(i)}`,
    maxTokens: 600,
  }),
  social: (i) => ({
    system: BRAND_SYSTEM,
    prompt: `Write a punchy social media post (max 60 words) with 4-6 relevant hashtags for ${i.platform ?? 'Instagram'}.\n${ctx(i)}`,
    maxTokens: 400,
  }),
  flyer: (i) => ({
    system: BRAND_SYSTEM,
    prompt: `Write flyer copy: a bold HEADLINE (max 7 words), 2 short benefit lines, and a CTA.\n${ctx(i)}`,
    maxTokens: 400,
  }),
  campaign: (i) => ({
    system: BRAND_SYSTEM,
    prompt: `Draft a concise multi-channel marketing campaign (goal, audience, 3 channel ideas with one message each, a CTA).\n${ctx(i)}`,
    maxTokens: 900,
  }),
  video_script: (i) => ({
    system: BRAND_SYSTEM,
    prompt: `Write a 25-second vertical reel script (shot directions + voiceover) to promote this.\n${ctx(i)}`,
    maxTokens: 700,
  }),
  brochure_copy: (i) => ({
    system: BRAND_SYSTEM,
    prompt: `Write one elegant brochure paragraph (70-100 words) plus a 5-7 word tagline.\n${ctx(i)}`,
    maxTokens: 500,
  }),
  lead_score: (i) => ({
    system:
      BRAND_SYSTEM +
      ' You are also a sales lead-scoring engine. Score buyer intent 0-100 and explain briefly.',
    prompt:
      'Score this real-estate lead from 0 (cold) to 100 (hot) based on intent signals. ' +
      'Respond with ONLY JSON: {"score": <integer 0-100>, "rationale": "<one or two sentences>"}.\n' +
      `Lead:\n${ctx(i)}\n${i.name ? `Name: ${i.name}\n` : ''}${i.source ? `Source: ${i.source}\n` : ''}${i.budget ? `Budget: ${i.budget}\n` : ''}${i.message ? `Message: ${i.message}\n` : ''}`,
    maxTokens: 400,
    json: true,
  }),
  assistant: (i) => ({
    system:
      BRAND_SYSTEM +
      ' Act as a knowledgeable real-estate sales advisor. Be helpful, accurate and concise. ' +
      'If unsure, say so. Do not invent specific JAMIN inventory or prices.',
    messages:
      Array.isArray(i.messages) && i.messages.length
        ? i.messages
        : [{ role: 'user', content: String(i.question ?? '') }],
    maxTokens: 1024,
  }),
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// deno-lint-ignore no-explicit-any
function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { feature, input } = await req.json();
    const builder = PROMPTS[feature];
    if (!builder) return json({ error: `Unknown feature: ${feature}` }, 400);

    // who is calling (JWT already verified by the gateway)
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: userData } = await anon.auth.getUser(token);
    const userId = userData.user?.id ?? null;

    if (!ANTHROPIC_API_KEY) {
      return json(
        { error: 'AI is not configured yet. Set ANTHROPIC_API_KEY in the Edge Function secrets.' },
        503,
      );
    }

    const spec = builder(input ?? {});
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: spec.maxTokens ?? 1024,
      system: spec.system,
      messages: spec.messages ?? [{ role: 'user', content: spec.prompt ?? '' }],
    });

    const text = msg.content
      // deno-lint-ignore no-explicit-any
      .filter((b: any) => b.type === 'text')
      // deno-lint-ignore no-explicit-any
      .map((b: any) => b.text)
      .join('\n')
      .trim();

    let score: number | null = null;
    let output = text;
    if (spec.json) {
      const parsed = safeJson(text);
      if (parsed && typeof parsed.score === 'number') score = Math.round(parsed.score);
      if (parsed && typeof parsed.rationale === 'string') output = parsed.rationale;
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: row } = await admin
      .from('ai_generations')
      .insert({
        user_id: userId,
        feature,
        input: input ?? {},
        output,
        score,
        meta: { model: MODEL, usage: msg.usage },
        status: 'done',
      })
      .select('id')
      .single();

    return json({ id: row?.id ?? null, feature, output, score, model: MODEL });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
