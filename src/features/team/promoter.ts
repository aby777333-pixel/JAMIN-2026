import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Promoter workspace data layer (migration 0102): the one-row dashboard rollup,
 * the buyer/seller client book, and manual team invitations. All server-scoped —
 * RLS/RPCs only ever return the caller's own clients, targets and invites.
 */

export interface PromoterDashboard {
  total_buyers: number;
  total_sellers: number;
  active_listings: number;
  new_leads: number;
  pending_followups: number;
  upcoming_visits: number;
  sales_closed: number;
  commission_earned: number;
  commission_pending: number;
  wallet_balance: number;
  month_earned: number;
  target_amount: number;
  target_sales: number;
  achievement_pct: number | null;
}

/** One-row rollup for the promoter dashboard (RPC promoter_dashboard, 0102). */
export async function getPromoterDashboard(): Promise<PromoterDashboard | null> {
  const { data, error } = await supabase.rpc('promoter_dashboard');
  if (error) throw error;
  const rows = (data ?? []) as unknown as PromoterDashboard[];
  return rows[0] ?? null;
}

export function usePromoterDashboard() {
  return useQuery({ queryKey: ['promoter-dashboard'], queryFn: getPromoterDashboard });
}

export type ClientKind = 'buyer' | 'seller';

export interface PromoterClient {
  client_id: string;
  full_name: string | null;
  phone: string | null;
  role_slug: string | null;
  kyc_status: string | null;
  install_source: string | null;
  joined_at: string;
  open_leads: number;
  upcoming_visits: number;
}

/** My buyers or sellers — referral-bound or admin-assigned (RPC promoter_clients). */
export async function getPromoterClients(kind: ClientKind): Promise<PromoterClient[]> {
  const { data, error } = await supabase.rpc('promoter_clients', { p_kind: kind });
  if (error) throw error;
  return (data ?? []) as unknown as PromoterClient[];
}

export function usePromoterClients(kind: ClientKind) {
  return useQuery({
    queryKey: ['promoter-clients', kind],
    queryFn: () => getPromoterClients(kind),
  });
}

export interface TeamInvite {
  id: string;
  name: string | null;
  contact: string;
  channel: string;
  invited_role: string;
  status: string; // sent | accepted | cancelled
  created_at: string;
  accepted_at: string | null;
}

/** My own invitations, newest first (self RLS on team_invites). */
export async function listTeamInvites(): Promise<TeamInvite[]> {
  const { data, error } = await supabase
    .from('team_invites')
    .select('id, name, contact, channel, invited_role, status, created_at, accepted_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as TeamInvite[];
}

export function useTeamInvites() {
  return useQuery({ queryKey: ['team-invites'], queryFn: listTeamInvites });
}

export interface NewTeamInvite {
  name: string;
  contact: string;
  channel: string; // 'whatsapp' | 'other' | …
  invited_role: string;
}

/**
 * Record an invitation. Server-side it auto-flips to accepted when the invited
 * phone signs up with the inviter's referral code — no client action needed.
 */
export async function createTeamInvite(input: NewTeamInvite) {
  const { error } = await supabase.from('team_invites').insert({
    name: input.name || null,
    contact: input.contact,
    channel: input.channel,
    invited_role: input.invited_role,
  });
  if (error) throw error;
}

export function useCreateTeamInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTeamInvite,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['team-invites'] }),
  });
}

export async function cancelTeamInvite(id: string) {
  const { error } = await supabase.from('team_invites').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}

export function useCancelTeamInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelTeamInvite,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['team-invites'] }),
  });
}
