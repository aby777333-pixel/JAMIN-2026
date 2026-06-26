import { useQuery } from '@tanstack/react-query';

import { getDownline, getMemberStats, getTeamRoster, getTeamSummary, getTerritoryName } from './api';

export function useDownline() {
  return useQuery({ queryKey: ['downline'], queryFn: getDownline });
}

export function useTeamRoster() {
  return useQuery({ queryKey: ['team-roster'], queryFn: getTeamRoster });
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

export function useTerritoryName(territoryId: string | null | undefined) {
  return useQuery({
    queryKey: ['territory', territoryId],
    queryFn: () => getTerritoryName(territoryId ?? null),
    enabled: territoryId != null,
  });
}
