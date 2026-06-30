import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useLenders() {
  return useQuery({ queryKey: ['lenders'], queryFn: api.listLenders });
}

export function useMyApplications() {
  return useQuery({ queryKey: ['loan-applications'], queryFn: api.myApplications });
}

export function useApplyLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.applyLoan,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['loan-applications'] }),
  });
}
