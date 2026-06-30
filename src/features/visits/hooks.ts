import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import type { VisitStatus } from './api';

export function useMyVisits() {
  return useQuery({ queryKey: ['site-visits'], queryFn: api.listMyVisits });
}

export function useBookVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.bookSiteVisit,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['site-visits'] }),
  });
}

export function useSetVisitStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VisitStatus }) => api.setVisitStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['site-visits'] }),
  });
}

export function useCheckinVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lat, lng }: { id: string; lat: number; lng: number }) =>
      api.checkinVisit(id, lat, lng),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['site-visits'] }),
  });
}

export function useMyAvailability(agentId: string | undefined) {
  return useQuery({
    queryKey: ['availability', agentId],
    queryFn: () => api.listMyAvailability(agentId as string),
    enabled: !!agentId,
  });
}

export function useAddAvailability(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { weekday: number; start: string; end: string }) =>
      api.addAvailability({ agentId, ...input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['availability', agentId] }),
  });
}

export function useDeleteAvailability(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAvailability,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['availability', agentId] }),
  });
}
