import { useQuery } from '@tanstack/react-query';

import * as api from './api';

export function useIncomeSummary() {
  return useQuery({ queryKey: ['bazaar-income'], queryFn: api.getIncomeSummary });
}

export function useIncomeHistory(input: { type?: string | null; from?: string | null; to?: string | null }) {
  return useQuery({
    queryKey: ['bazaar-income-history', input.type ?? 'all', input.from ?? '', input.to ?? ''],
    queryFn: () => api.getIncomeHistory(input),
  });
}
