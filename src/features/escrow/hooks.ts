import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface EscrowMilestone {
  id: string;
  title: string;
  amount: number;
  status: string;
  due_date: string | null;
  booking_id: string;
  booking: {
    agent_id: string | null;
    buyer_id: string | null;
    property: { plot_code: string; project: { name: string } | null } | null;
  } | null;
}

export async function listMyEscrow(): Promise<EscrowMilestone[]> {
  const { data, error } = await supabase
    .from('escrow_milestones')
    .select('id, title, amount, status, due_date, booking_id, booking:bookings(agent_id, buyer_id, property:properties(plot_code, project:projects(name)))')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EscrowMilestone[];
}

export async function setEscrowStatus(id: string, status: 'pending' | 'funded' | 'released' | 'refunded') {
  const { error } = await supabase.rpc('set_escrow_status', { p_milestone: id, p_status: status });
  if (error) throw error;
}

export function useMyEscrow() {
  return useQuery({ queryKey: ['escrow'], queryFn: listMyEscrow });
}

export function useSetEscrowStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'funded' | 'released' | 'refunded' }) =>
      setEscrowStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['escrow'] }),
  });
}
