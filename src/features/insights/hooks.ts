import { useQuery } from '@tanstack/react-query';

import * as api from './api';

export function useMarketTrends() {
  return useQuery({ queryKey: ['market-trends'], queryFn: api.marketTrends });
}

export function useInvestmentHotspots() {
  return useQuery({ queryKey: ['hotspots'], queryFn: api.investmentHotspots });
}

export type Season = 'month' | 'last_month' | 'all';

function rangeFor(season: Season): { from: string; to: string } {
  const now = new Date();
  if (season === 'all') return { from: '2000-01-01T00:00:00.000Z', to: '2999-01-01T00:00:00.000Z' };
  if (season === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useSeasonLeaderboard(season: Season) {
  const { from, to } = rangeFor(season);
  return useQuery({ queryKey: ['season-lb', season], queryFn: () => api.seasonLeaderboard(from, to) });
}
