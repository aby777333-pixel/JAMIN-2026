import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useMyMedia() {
  return useQuery({ queryKey: ['my-media'], queryFn: api.listMyMedia });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.uploadMedia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-media'] }),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteMedia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-media'] }),
  });
}
