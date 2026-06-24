import { useQuery } from '@tanstack/react-query';

import { getDownline, getMemberStats, getTeamSummary } from './api';

export function useDownline() {
  return useQuery({ queryKey: ['downline'], queryFn: getDownline });
}

export function useTeamSummary() {
  return useQuery({ queryKey: ['team-summary'], queryFn: getTeamSummary });
}

export function useMemberStats(memberId: string | undefined) {
  return useQuery({
    queryKey: ['member-stats', memberId],
    queryFn: () => getMemberStats(memberId as string),
    enabled: !!memberId,
  });
}
