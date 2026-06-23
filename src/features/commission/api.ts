import { supabase } from '@/lib/supabase';
import type { CommissionRule } from './engine';

/** Active commission rules (RLS: any authenticated user may read config). */
export async function getActiveRules(): Promise<CommissionRule[]> {
  const { data, error } = await supabase
    .from('commission_rules')
    .select('scope, match, formula, priority, active')
    .eq('active', true)
    .order('priority', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CommissionRule[];
}
