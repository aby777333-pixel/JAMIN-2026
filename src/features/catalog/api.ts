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

/**
 * Single feature-flag check against app_features (disabled rows stay readable).
 * Returns false while the row is missing — a flag-gated surface stays hidden
 * until the Super Admin explicitly turns it on from web admin → Features.
 */
export function useFeatureEnabled(key: string) {
  return useQuery({
    queryKey: ['app_feature', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_features')
        .select('enabled')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data as { enabled?: boolean } | null)?.enabled === true;
    },
    staleTime: 5 * 60_000,
  });
}
