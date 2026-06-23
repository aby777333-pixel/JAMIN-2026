import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type LeaderMetric = 'earnings' | 'sales' | 'team' | 'referrals';

export interface LeaderRow {
  user_id: string;
  full_name: string | null;
  role_name: string | null;
  value: number;
  rank: number;
}

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string;
  criteria: { type?: string; threshold?: number };
}

export async function getLeaderboard(metric: LeaderMetric): Promise<LeaderRow[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_metric: metric, p_limit: 20 });
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}

export async function getBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('id, key, name, description, icon, tier, criteria')
    .eq('active', true);
  if (error) throw error;
  return (data ?? []) as unknown as Badge[];
}

export async function getMyBadgeIds(): Promise<Set<string>> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return new Set();
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', me.user.id);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.badge_id));
}

export function useLeaderboard(metric: LeaderMetric) {
  return useQuery({ queryKey: ['leaderboard', metric], queryFn: () => getLeaderboard(metric) });
}
export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: getBadges, staleTime: 5 * 60_000 });
}
export function useMyBadges() {
  return useQuery({ queryKey: ['my_badges'], queryFn: getMyBadgeIds });
}
