import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Incentive / bonus programs (§6 Promoter Portal — Bonus Structures + Incentive
 * Tracking). These are the dynamic commission_rules whose scope is an incentive
 * type (bonus / slab / team override) — readable by any signed-in partner.
 */
export interface SlabTier {
  min?: number;
  max?: number;
  value?: number;
}

export interface IncentiveRule {
  id: string;
  name: string;
  scope: string;
  formula: { type?: string; value?: number; slabs?: SlabTier[] };
  currency: string;
  priority: number;
}

export async function getIncentiveRules(): Promise<IncentiveRule[]> {
  const { data, error } = await supabase
    .from('commission_rules')
    .select('id, name, scope, formula, currency, priority')
    .eq('active', true)
    .in('scope', ['bonus', 'slab', 'team'])
    .order('priority', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as IncentiveRule[];
}

export function useIncentiveRules() {
  return useQuery({ queryKey: ['incentive_rules'], queryFn: getIncentiveRules, staleTime: 5 * 60_000 });
}
