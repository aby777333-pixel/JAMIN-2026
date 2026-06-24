import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  bonus: number;
}

export interface MyBadge {
  badge_id: string;
  bonus_claimed_at: string | null;
}

export async function getLeaderboard(metric: LeaderMetric): Promise<LeaderRow[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_metric: metric, p_limit: 20 });
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}

export async function getBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('id, key, name, description, icon, tier, criteria, bonus')
    .eq('active', true);
  if (error) throw error;
  return (data ?? []) as unknown as Badge[];
}

/** The caller's earned badges with claim status (§15 Bonus Rewards). */
export async function getMyBadges(): Promise<MyBadge[]> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_id, bonus_claimed_at')
    .eq('user_id', me.user.id);
  if (error) throw error;
  return (data ?? []) as unknown as MyBadge[];
}

/** Claim a badge's cash bonus → posts to the ledger (idempotent, server-guarded). */
export async function claimBadgeBonus(badgeId: string): Promise<number> {
  const { data, error } = await supabase.rpc('claim_badge_bonus', { p_badge: badgeId });
  if (error) throw error;
  return Number(data ?? 0);
}

export function useLeaderboard(metric: LeaderMetric) {
  return useQuery({ queryKey: ['leaderboard', metric], queryFn: () => getLeaderboard(metric) });
}
export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: getBadges, staleTime: 5 * 60_000 });
}
export function useMyBadges() {
  return useQuery({ queryKey: ['my_badges'], queryFn: getMyBadges });
}
export function useClaimBadgeBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: claimBadgeBonus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_badges'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['withdrawals'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
