import { useQuery } from '@tanstack/react-query';

import { getDownline, getTeamSummary } from './api';

export function useDownline() {
  return useQuery({ queryKey: ['downline'], queryFn: getDownline });
}

export function useTeamSummary() {
  return useQuery({ queryKey: ['team-summary'], queryFn: getTeamSummary });
}
