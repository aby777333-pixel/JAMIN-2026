import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useReels() {
  return useQuery({ queryKey: ['reels'], queryFn: api.listReels });
}

export function useAddReel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addReel,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reels'] }),
  });
}

export function useDeleteReel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteReel,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reels'] }),
  });
}
