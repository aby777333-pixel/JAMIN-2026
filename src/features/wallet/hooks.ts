import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useWalletSummary() {
  return useQuery({ queryKey: ['wallet'], queryFn: api.getWalletSummary });
}

export function useWithdrawals() {
  return useQuery({ queryKey: ['withdrawals'], queryFn: api.getWithdrawals });
}

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.requestWithdrawal,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['withdrawals'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
