import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface MarketingAsset {
  id: string;
  title: string;
  kind: string;
  file_url: string;
  thumb_url: string | null;
  mime: string | null;
}

/** Admin-uploaded brochure / flyer / poster files, shown in the app library. */
export async function getMarketingAssets(): Promise<MarketingAsset[]> {
  const { data, error } = await supabase
    .from('marketing_assets')
    .select('id, title, kind, file_url, thumb_url, mime')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MarketingAsset[];
}

export function useMarketingAssets() {
  return useQuery({ queryKey: ['marketing_assets'], queryFn: getMarketingAssets, staleTime: 5 * 60_000 });
}
