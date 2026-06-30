import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Property ids the current user is watching. */
export async function getMyWatchIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('property_watches').select('property_id');
  if (error) throw error;
  return new Set(((data ?? []) as { property_id: string }[]).map((r) => r.property_id));
}

export async function toggleWatch(propertyId: string, watching: boolean) {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) throw new Error('Not signed in');
  if (watching) {
    const { error } = await supabase.from('property_watches').delete().eq('property_id', propertyId).eq('user_id', me.user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('property_watches')
      .upsert({ property_id: propertyId, user_id: me.user.id }, { onConflict: 'user_id,property_id' });
    if (error) throw error;
  }
}

export function useMyWatchIds() {
  return useQuery({ queryKey: ['watch-ids'], queryFn: getMyWatchIds });
}

export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, watching }: { propertyId: string; watching: boolean }) =>
      toggleWatch(propertyId, watching),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['watch-ids'] }),
  });
}
