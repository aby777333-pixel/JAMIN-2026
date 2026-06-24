import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Campaigns + referral funnel (§8, MOD08). Campaigns are DB rows owned by the sharer. */
export interface Campaign {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  artifact_type: string;
  channel: string | null;
  active: boolean;
  created_at: string;
}

export interface ReferralFunnel {
  shared: number;
  clicked: number;
  registered: number;
  verified: number;
  assigned: number;
  flagged: number;
  total: number;
}

const EMPTY_FUNNEL: ReferralFunnel = {
  shared: 0,
  clicked: 0,
  registered: 0,
  verified: 0,
  assigned: 0,
  flagged: 0,
  total: 0,
};

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'campaign'
  );
}

export async function getCampaigns(): Promise<Campaign[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('owner_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Campaign[];
}

export async function createCampaign(input: {
  name: string;
  artifactType?: 'card' | 'brochure' | 'ad' | 'link';
  channel?: string;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in');
  const slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from('campaigns').insert({
    owner_id: auth.user.id,
    name: input.name.trim(),
    slug,
    artifact_type: input.artifactType ?? 'link',
    channel: input.channel ?? null,
  });
  if (error) throw error;
}

export async function getReferralFunnel(days = 30): Promise<ReferralFunnel> {
  const { data, error } = await supabase.rpc('referral_funnel', { p_days: days });
  if (error) throw error;
  return { ...EMPTY_FUNNEL, ...((data ?? {}) as Partial<ReferralFunnel>) };
}

export function useCampaigns() {
  return useQuery({ queryKey: ['campaigns'], queryFn: getCampaigns });
}

export function useReferralFunnel(days = 30) {
  return useQuery({ queryKey: ['referral_funnel', days], queryFn: () => getReferralFunnel(days) });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}
