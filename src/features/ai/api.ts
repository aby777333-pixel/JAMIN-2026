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
