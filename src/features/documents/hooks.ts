import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useMyDocuments() {
  return useQuery({ queryKey: ['documents'], queryFn: api.listMyDocuments });
}

export function useAddDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addDocument,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDocMutations() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['documents'] });
  return {
    setSign: useMutation({
      mutationFn: ({ id, status }: { id: string; status: 'none' | 'requested' | 'signed' }) =>
        api.setSignStatus(id, status),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: api.deleteDocument, onSuccess: invalidate }),
  };
}
