import { supabase } from '@/lib/supabase';

export interface BookingPayment {
  id: string;
  amount: number;
  status: string;
  short_url: string | null;
  created_at: string;
}

export interface BookingWithPayments {
  id: string;
  status: string;
  amount: number;
  schedule: string | null;
  created_at: string;
  property: { plot_code: string; project: { name: string } | null } | null;
  payments: BookingPayment[];
}

/** The caller's bookings + their payment rows (RLS scopes to buyer/agent/admin). */
export async function getMyBookings(): Promise<BookingWithPayments[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, status, amount, schedule, created_at, property:properties(plot_code, project:projects(name)), payments(id, amount, status, short_url, created_at)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BookingWithPayments[];
}

export interface CreateLinkResult {
  configured: boolean;
  message?: string;
  short_url?: string;
  payment_id?: string;
  error?: string;
}

/** Ask the payments Edge Function for a hosted checkout link for a booking. */
export async function createPaymentLink(bookingId: string): Promise<CreateLinkResult> {
  const { data, error } = await supabase.functions.invoke('payments', {
    body: { action: 'create_link', booking_id: bookingId },
  });
  if (error) throw error;
  return data as CreateLinkResult;
}

/** Reconcile a booking's payment status from the gateway (call on return / pull-refresh). */
export async function syncBookingPayments(bookingId: string): Promise<{ configured: boolean; updated: number }> {
  const { data, error } = await supabase.functions.invoke('payments', {
    body: { action: 'sync', booking_id: bookingId },
  });
  if (error) throw error;
  return data as { configured: boolean; updated: number };
}
