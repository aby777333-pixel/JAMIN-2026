import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface DripSequence {
  id: string;
  name: string;
  steps: { offset_days?: number; title?: string; body?: string }[];
}

export async function listSequences(): Promise<DripSequence[]> {
  const { data, error } = await supabase
    .from('drip_sequences')
    .select('id, name, steps')
    .eq('active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DripSequence[];
}

export async function enrollDrip(leadId: string, sequenceId: string) {
  const { error } = await supabase.rpc('enroll_drip', { p_lead: leadId, p_sequence: sequenceId });
  if (error) throw error;
}

export function useSequences() {
  return useQuery({ queryKey: ['drip-sequences'], queryFn: listSequences });
}

export function useEnrollDrip() {
  return useMutation({
    mutationFn: ({ leadId, sequenceId }: { leadId: string; sequenceId: string }) => enrollDrip(leadId, sequenceId),
  });
}
