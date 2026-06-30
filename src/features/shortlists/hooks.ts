import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useMyShortlists() {
  return useQuery({ queryKey: ['shortlists'], queryFn: api.listMyShortlists });
}

export function useShortlist(id: string | undefined) {
  return useQuery({
    queryKey: ['shortlist', id],
    queryFn: () => api.getShortlist(id as string),
    enabled: !!id,
  });
}

export function useShortlistItems(id: string | undefined) {
  return useQuery({
    queryKey: ['shortlist-items', id],
    queryFn: () => api.getShortlistItems(id as string),
    enabled: !!id,
  });
}

export function useCreateShortlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createShortlist,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shortlists'] }),
  });
}

export function useJoinShortlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.joinShortlist,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shortlists'] }),
  });
}

export function useAddShortlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shortlistId, propertyId }: { shortlistId: string; propertyId: string }) =>
      api.addShortlistItem(shortlistId, propertyId),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['shortlist-items', v.shortlistId] });
      void qc.invalidateQueries({ queryKey: ['shortlists'] });
    },
  });
}

export function useShortlistMutations(shortlistId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['shortlist-items', shortlistId] });
  return {
    remove: useMutation({ mutationFn: api.removeShortlistItem, onSuccess: invalidate }),
    vote: useMutation({
      mutationFn: ({ itemId, value }: { itemId: string; value: -1 | 1 }) => api.voteShortlistItem(itemId, value),
      onSuccess: invalidate,
    }),
    comment: useMutation({
      mutationFn: ({ itemId, body }: { itemId: string; body: string }) => api.commentShortlistItem(itemId, body),
      onSuccess: invalidate,
    }),
  };
}
