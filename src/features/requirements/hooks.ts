import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useMyRequirements() {
  return useQuery({ queryKey: ['requirements'], queryFn: api.getMyRequirements });
}

export function useCreateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createRequirement,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requirements'] }),
  });
}

export function useDeleteRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteRequirement,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requirements'] }),
  });
}

export function useRequirementMatchCounts() {
  return useQuery({ queryKey: ['requirement-matches'], queryFn: api.getMyRequirementMatchCounts });
}

export function useSetRequirementNotify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notify }: { id: string; notify: boolean }) =>
      api.setRequirementNotify(id, notify),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requirements'] }),
  });
}
