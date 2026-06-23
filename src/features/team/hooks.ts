import { useQuery } from '@tanstack/react-query';

import { getDownline } from './api';

export function useDownline() {
  return useQuery({ queryKey: ['downline'], queryFn: getDownline });
}
