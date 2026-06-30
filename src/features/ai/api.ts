import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type AIFeature =
  | 'description'
  | 'social'
  | 'flyer'
  | 'campaign'
  | 'video_script'
  | 'brochure_copy'
  | 'lead_score'
  | 'assistant';

export interface AIResult {
  id: string | null;
  feature: AIFeature;
  output: string;
  score: number | null;
  model: string;
}

/** All AI goes through the ai-generate Edge Function — never Anthropic directly (§10). */
export async function callAI(feature: AIFeature, input: Record<string, unknown>): Promise<AIResult> {
  const { data, error } = await supabase.functions.invoke('ai-generate', {
    body: { feature, input },
  });
  if (error) {
    let message = error.message;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (error as any).context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as AIResult;
}

export function useAIGenerate() {
  return useMutation({
    mutationFn: ({ feature, input }: { feature: AIFeature; input: Record<string, unknown> }) =>
      callAI(feature, input),
  });
}

export interface EnhanceResult {
  configured: boolean;
  url?: string;
  message?: string;
  error?: string;
}

export interface StageResult {
  configured: boolean;
  url?: string;
  message?: string;
  pending?: boolean;
  error?: string;
}

/** AI virtual staging — furnishes an empty room. Inert until IMAGE_GEN_API_KEY is set server-side. */
export async function virtualStage(base64: string, prompt: string, mime = 'image/jpeg'): Promise<StageResult> {
  const { data, error } = await supabase.functions.invoke('virtual-stage', {
    body: { image_base64: base64, prompt, mime },
  });
  if (error) {
    let message = error.message;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (error as any).context?.json?.();
      if (body?.message || body?.error) message = body.message ?? body.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return data as StageResult;
}

/** AI photo enhancement (§14) — sends a base64 image to the image-enhance Edge Function. */
export async function enhancePhoto(base64: string, mime = 'image/jpeg'): Promise<EnhanceResult> {
  const { data, error } = await supabase.functions.invoke('image-enhance', {
    body: { image_base64: base64, mime },
  });
  if (error) {
    let message = error.message;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (error as any).context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return data as EnhanceResult;
}
