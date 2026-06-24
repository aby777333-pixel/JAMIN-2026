import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Dynamic feature catalog (MOD16 Core Platform Rule). Rows live in app_features and
 * are managed by the Super Admin (web admin → Features). Read-only here.
 */
export interface AppFeature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  enabled: boolean;
  sort_order: number;
}

export async function getFeatures(): Promise<AppFeature[]> {
  const { data, error } = await supabase
    .from('app_features')
    .select('id, key, name, description, category, icon, enabled, sort_order')
    .eq('enabled', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AppFeature[];
}

export function useFeatures() {
  return useQuery({ queryKey: ['app_features'], queryFn: getFeatures, staleTime: 5 * 60_000 });
}
