import { useQuery } from '@tanstack/react-query';

import { getActiveRules } from './api';

export function useActiveRules() {
  return useQuery({
    queryKey: ['commission_rules'],
    queryFn: getActiveRules,
    staleTime: 5 * 60_000,
  });
}
