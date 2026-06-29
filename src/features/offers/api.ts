import { supabase } from '@/lib/supabase';

export interface MyOffer {
  id: string;
  property_id: string;
  amount: number;
  status: 'pending' | 'countered' | 'accepted' | 'declined' | 'withdrawn';
  counter_amount: number | null;
  counter_message: string | null;
  created_at: string;
  property: { plot_code: string } | null;
}

/** Buyer makes an offer (RPC notifies the seller). */
export async function makeOffer(input: { propertyId: string; amount: number; message?: string }) {
  const { error } = await supabase.rpc('make_offer', {
    p_property: input.propertyId,
    p_amount: input.amount,
    p_message: input.message,
  });
  if (error) throw error;
}

/** The signed-in buyer's own offers (RLS scopes to buyer/seller/admin). */
export async function getMyOffers(): Promise<MyOffer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('id, property_id, amount, status, counter_amount, counter_message, created_at, property:properties(plot_code)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MyOffer[];
}

export async function withdrawOffer(id: string) {
  const { error } = await supabase.rpc('withdraw_offer', { p_offer: id });
  if (error) throw error;
}

/** Raise a dispute / report a problem about a property (RLS: raised_by = self). */
export async function raiseDispute(input: { subject: string; details?: string; propertyId?: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Not signed in');
  const { error } = await supabase.from('disputes').insert({
    raised_by: u.user.id,
    subject: input.subject,
    details: input.details ?? null,
    property_id: input.propertyId ?? null,
  });
  if (error) throw error;
}
