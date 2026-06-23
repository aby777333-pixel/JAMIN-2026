import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import type { LeadStatus } from './api';

export function useLeads(status?: string) {
  return useQuery({ queryKey: ['leads', status ?? 'all'], queryFn: () => api.listLeads(status) });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.getLead(id as string),
    enabled: !!id,
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      api.updateLeadStatus(id, status),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['leads'] });
      void qc.invalidateQueries({ queryKey: ['lead', v.id] });
    },
  });
}

export function useFollowUps(leadId: string | undefined) {
  return useQuery({
    queryKey: ['followups', leadId],
    queryFn: () => api.listFollowUps(leadId as string),
    enabled: !!leadId,
  });
}

export function useCreateFollowUp(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { dueAt: string; note: string }) =>
      api.createFollowUp({ leadId, ...input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['followups', leadId] }),
  });
}

export function useSetFollowUpStatus(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.setFollowUpStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['followups', leadId] }),
  });
}
