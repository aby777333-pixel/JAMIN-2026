import { supabase } from '@/lib/supabase';

export const CONSULT_TOPICS = ['Vastu', 'Astrology / Muhurat', 'Investment advice', 'Home loan'] as const;
export type ConsultTopic = (typeof CONSULT_TOPICS)[number];

/**
 * A buyer requests to talk to a Vastu/astrology/investment expert. Routed into
 * the existing leads pipeline (source 'expert_consult'), so it shows up in the
 * admin CRM. No property is required.
 */
export async function requestConsult(input: {
  name: string;
  phone: string;
  topic: string;
  note?: string;
  propertyId?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Not signed in');
  const { error } = await supabase.from('leads').insert({
    owner_id: u.user.id,
    property_id: input.propertyId ?? null,
    source: 'expert_consult',
    status: 'new',
    contact: { name: input.name, phone: input.phone, topic: input.topic, note: input.note ?? '' },
  });
  if (error) throw error;
}
