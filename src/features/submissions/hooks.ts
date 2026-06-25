import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PickedImage } from '@/lib/upload';
import * as api from './api';

export function useMySubmissions() {
  return useQuery({ queryKey: ['my-submissions'], queryFn: api.listMySubmissions });
}

export function useSubmitPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { propertyId: string; assets: PickedImage[] }) =>
      api.submitPropertyPhotos(v.propertyId, v.assets),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-submissions'] }),
  });
}
