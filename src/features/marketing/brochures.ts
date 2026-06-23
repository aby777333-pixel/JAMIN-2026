import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface BrochureConfig {
  accent?: string;
  headline?: string;
  subhead?: string;
  body?: string;
  cta?: string;
}

export interface BrochureTemplate {
  id: string;
  name: string;
  kind: string;
  config: BrochureConfig;
}

export async function getBrochureTemplates(): Promise<BrochureTemplate[]> {
  const { data, error } = await supabase
    .from('brochure_templates')
    .select('id, name, kind, config')
    .eq('active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as BrochureTemplate[];
}

export async function getBrochureTemplate(id: string): Promise<BrochureTemplate | null> {
  const { data, error } = await supabase
    .from('brochure_templates')
    .select('id, name, kind, config')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BrochureTemplate) ?? null;
}

export async function logBrochure(input: { templateId: string; channel?: string }) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase
    .from('brochures')
    .insert({ user_id: data.user.id, template_id: input.templateId, channel: input.channel })
    .then(
      () => {},
      () => {},
    );
}

export function useBrochureTemplates() {
  return useQuery({ queryKey: ['brochure_templates'], queryFn: getBrochureTemplates, staleTime: 5 * 60_000 });
}

export function useBrochureTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['brochure_template', id],
    queryFn: () => getBrochureTemplate(id as string),
    enabled: !!id,
  });
}
