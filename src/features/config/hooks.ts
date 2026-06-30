import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Read a dynamic value from system_config (admin-editable, §13). Falls back if absent. */
export async function getConfig<T = unknown>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase.from('system_config').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  const v = (data as { value?: unknown } | null)?.value;
  return (v ?? fallback) as T;
}

export function useConfig<T = unknown>(key: string, fallback: T) {
  return useQuery({
    queryKey: ['config', key],
    queryFn: () => getConfig<T>(key, fallback),
    staleTime: 5 * 60 * 1000,
  });
}
