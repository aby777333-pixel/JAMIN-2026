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
