import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import type { FormField } from '@/features/forms/types';

export const useAdminStats = () => useQuery({ queryKey: ['admin', 'stats'], queryFn: api.getAdminStats });
export const useUsers = () => useQuery({ queryKey: ['admin', 'users'], queryFn: api.listUsers });
export const useRolesList = () => useQuery({ queryKey: ['admin', 'roles'], queryFn: api.getRoles, staleTime: 5 * 60_000 });
export const useForms = () => useQuery({ queryKey: ['admin', 'forms'], queryFn: api.listForms });
export const useRules = () => useQuery({ queryKey: ['admin', 'rules'], queryFn: api.listRules });
export const usePendingWithdrawals = () =>
  useQuery({ queryKey: ['admin', 'withdrawals'], queryFn: api.listPendingWithdrawals });
export const useOpenBookings = () => useQuery({ queryKey: ['admin', 'bookings'], queryFn: api.listOpenBookings });

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => api.setUserRole(userId, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSetKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'verified' | 'rejected' | 'pending' }) =>
      api.setKyc(userId, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useSaveFormFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: FormField[] }) => api.saveFormFields(id, fields),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'forms'] });
      void qc.invalidateQueries({ queryKey: ['form_def'] });
    },
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.toggleRule(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'rules'] }),
  });
}

export function useSetWithdrawalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'paid' | 'rejected' }) =>
      api.setWithdrawalStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useCloseSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => api.closeSale(bookingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
