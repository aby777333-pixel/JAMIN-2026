import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useMyListingStats() {
  return useQuery({ queryKey: ['seller-listings'], queryFn: api.getMyListingStats });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createListing,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['seller-listings'] });
      void qc.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useMyListing(id: string) {
  return useQuery({
    queryKey: ['seller-listing', id],
    queryFn: () => api.getMyListing(id),
    enabled: !!id,
  });
}

export function useUpdateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: api.ListingPatch }) =>
      api.updateListing(id, patch),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['seller-listings'] });
      void qc.invalidateQueries({ queryKey: ['properties'] });
      void qc.invalidateQueries({ queryKey: ['seller-listing', vars.id] });
    },
  });
}
