import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useMyOffers() {
  return useQuery({ queryKey: ['my-offers'], queryFn: api.getMyOffers });
}

export function useMakeOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.makeOffer,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-offers'] }),
  });
}

export function useWithdrawOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.withdrawOffer,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-offers'] }),
  });
}

export function useRaiseDispute() {
  return useMutation({ mutationFn: api.raiseDispute });
}
