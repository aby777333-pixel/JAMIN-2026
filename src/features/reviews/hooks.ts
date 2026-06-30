import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useProjectReviews(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', projectId],
    queryFn: () => api.listProjectReviews(projectId as string),
    enabled: !!projectId,
  });
}

export function useProjectRating(projectId: string | undefined) {
  return useQuery({
    queryKey: ['rating', projectId],
    queryFn: () => api.getProjectRating(projectId as string),
    enabled: !!projectId,
  });
}

export function useSubmitReview(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; title?: string; body?: string }) =>
      api.submitReview({ projectId: projectId as string, ...input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews', projectId] });
      void qc.invalidateQueries({ queryKey: ['rating', projectId] });
    },
  });
}
