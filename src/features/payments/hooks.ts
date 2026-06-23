import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createPaymentLink, getMyBookings, syncBookingPayments } from './api';

export function useMyBookings() {
  return useQuery({ queryKey: ['my-bookings'], queryFn: getMyBookings });
}

export function useCreatePaymentLink() {
  return useMutation({ mutationFn: createPaymentLink });
}

export function useSyncBookingPayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncBookingPayments,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-bookings'] }),
  });
}
