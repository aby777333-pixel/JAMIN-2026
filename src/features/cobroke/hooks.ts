import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useOpenCobroke() {
  return useQuery({ queryKey: ['cobroke-open'], queryFn: api.listOpenCobroke });
}

export function useMyCobroke() {
  return useQuery({ queryKey: ['cobroke-mine'], queryFn: api.listMyCobroke });
}

export function useCobrokeInterests(listingId: string | undefined) {
  return useQuery({
    queryKey: ['cobroke-interests', listingId],
    queryFn: () => api.listInterests(listingId as string),
    enabled: !!listingId,
  });
}

export function usePostCobroke() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.postCobroke,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cobroke-mine'] });
      void qc.invalidateQueries({ queryKey: ['cobroke-open'] });
    },
  });
}

export function useExpressInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, message }: { listingId: string; message?: string }) =>
      api.expressInterest(listingId, message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cobroke-open'] }),
  });
}

export function useRespondInterest(listingId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interestId, decision }: { interestId: string; decision: 'accepted' | 'declined' }) =>
      api.respondInterest(interestId, decision),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cobroke-interests', listingId] });
      void qc.invalidateQueries({ queryKey: ['cobroke-mine'] });
    },
  });
}
