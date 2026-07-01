import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { FESTIVALS, type Festival } from './festivals';

/**
 * Festivals for the Home banner — admin-managed in the `festivals` table (edited
 * from the web admin "Festivals" tab). Falls back to the bundled list if the
 * table is empty or unreachable, so the banner never breaks offline.
 */
export function useFestivals() {
  return useQuery({
    queryKey: ['festivals'],
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<Festival[]> => {
      try {
        const { data, error } = await supabase
          .from('festivals')
          .select('key,name,festival_date,blurb,active,sort_order')
          .eq('active', true)
          .order('festival_date');
        if (error) throw error;
        const rows: Festival[] = (data ?? []).map((r) => ({
          key: r.key ?? r.name,
          name: r.name,
          date: r.festival_date,
          blurb: r.blurb ?? '',
        }));
        return rows.length ? rows : FESTIVALS;
      } catch {
        return FESTIVALS; // graceful fallback — banner still works
      }
    },
  });
}
