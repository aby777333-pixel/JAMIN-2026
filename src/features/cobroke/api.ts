import { supabase } from '@/lib/supabase';

export interface CobrokeListing {
  id: string;
  property_id: string;
  posted_by: string;
  split_pct: number;
  note: string | null;
  status: string;
  created_at: string;
  property: { plot_code: string; price: number; project: { name: string } | null } | null;
  poster: { full_name: string | null } | null;
}

export interface CobrokeInterest {
  id: string;
  listing_id: string;
  agent_id: string;
  message: string | null;
  status: string;
  created_at: string;
  agent: { full_name: string | null; phone: string | null } | null;
}

const LISTING_SELECT =
  'id, property_id, posted_by, split_pct, note, status, created_at, ' +
  'property:properties(plot_code, price, project:projects(name)), ' +
  'poster:profiles!cobroke_listings_posted_by_fkey(full_name)';

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
}

/** Open co-broke offers from other agents. */
export async function listOpenCobroke(): Promise<CobrokeListing[]> {
  const me = await uid();
  const { data, error } = await supabase
    .from('cobroke_listings')
    .select(LISTING_SELECT)
    .eq('status', 'open')
    .neq('posted_by', me)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CobrokeListing[];
}

export async function listMyCobroke(): Promise<CobrokeListing[]> {
  const me = await uid();
  const { data, error } = await supabase
    .from('cobroke_listings')
    .select(LISTING_SELECT)
    .eq('posted_by', me)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CobrokeListing[];
}

export async function listInterests(listingId: string): Promise<CobrokeInterest[]> {
  const { data, error } = await supabase
    .from('cobroke_interests')
    .select('id, listing_id, agent_id, message, status, created_at, agent:profiles!cobroke_interests_agent_id_fkey(full_name, phone)')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CobrokeInterest[];
}

export async function postCobroke(input: { propertyId: string; splitPct: number; note?: string }) {
  const posted_by = await uid();
  const { error } = await supabase.from('cobroke_listings').upsert(
    { property_id: input.propertyId, posted_by, split_pct: input.splitPct, note: input.note || null, status: 'open' },
    { onConflict: 'property_id,posted_by' },
  );
  if (error) throw error;
}

export async function expressInterest(listingId: string, message?: string) {
  const { error } = await supabase.rpc('express_cobroke_interest', { p_listing: listingId, p_message: message });
  if (error) throw error;
}

export async function respondInterest(interestId: string, decision: 'accepted' | 'declined') {
  const { error } = await supabase.rpc('respond_cobroke_interest', { p_interest: interestId, p_decision: decision });
  if (error) throw error;
}

export async function closeCobroke(id: string) {
  const { error } = await supabase.from('cobroke_listings').update({ status: 'closed' }).eq('id', id);
  if (error) throw error;
}
