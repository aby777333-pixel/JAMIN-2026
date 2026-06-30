import { callAI } from './api';

export interface PropAiCtx {
  title?: string | null;
  project?: string | null;
  location?: string | null;
  price: number;
  type?: string | null;
  area?: string | null;
}

function ctxLine(c: PropAiCtx): string {
  return `Property: ${c.title || c.project || 'plot'} (${c.type || 'property'}) in ${c.location || 'unknown location'}, listed at ₹${c.price}${c.area ? `, area ${c.area}` : ''}.`;
}

/** Per-listing buyer Q&A — answered by the existing assistant feature (no edge change). */
export async function askAboutProperty(c: PropAiCtx, question: string): Promise<string> {
  const res = await callAI('assistant', {
    messages: [
      {
        role: 'user',
        content: `You are a concise, honest Indian real-estate advisor. ${ctxLine(c)} Answer the buyer's question in 2-4 sentences. If something isn't in the details, say it should be confirmed with the seller/agent.\n\nQuestion: ${question}`,
      },
    ],
  });
  return res.output;
}

/** AI fair-price assessment (clearly framed as an estimate, not a valuation). */
export async function estimateFairPrice(c: PropAiCtx): Promise<string> {
  const res = await callAI('assistant', {
    messages: [
      {
        role: 'user',
        content: `${ctxLine(c)} Give a brief fair-value view for this type/location in India: state whether the asking price looks reasonable, an estimated fair price range in ₹, and 2-3 short bullet reasons. End with: "AI estimate — not a formal valuation."`,
      },
    ],
  });
  return res.output;
}

/** Translate the listing into a regional language. */
export async function translateListing(c: PropAiCtx, language: string, description?: string | null): Promise<string> {
  const res = await callAI('assistant', {
    messages: [
      {
        role: 'user',
        content: `Translate this property listing into ${language} in a natural, appealing tone. Return only the translation.\n\nTitle/Project: ${c.title || c.project || ''}\nLocation: ${c.location || ''}\nPrice: ₹${c.price}\nDescription: ${description || '(no description provided)'}`,
      },
    ],
  });
  return res.output;
}
