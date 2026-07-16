import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

/**
 * Buyer contact routing (Buyer module spec): a buyer who came in through a
 * promoter's referral link talks ONLY to that promoter; a direct-install buyer
 * talks to JAMIN. The promoter's contact is exposed through a SECURITY DEFINER
 * RPC scoped to the caller's own assigned promoter — profiles RLS stays closed.
 */
export interface PromoterContact {
  promoter_id: string;
  full_name: string | null;
  phone: string | null;
  photo_url: string | null;
}

export async function getMyPromoterContact(): Promise<PromoterContact | null> {
  const { data, error } = await supabase.rpc('get_my_promoter_contact');
  if (error) throw error;
  const rows = (data ?? []) as PromoterContact[];
  return rows[0] ?? null;
}

/** Roles whose contact routing follows the install source (buyer + seller-side roles). */
export const CONTACT_ROUTED_ROLES = ['buyer', 'seller', 'builder', 'developer'];

/** True when this profile's contact should route to their assigned promoter. */
export function isReferralRouted(profile: { role_slug?: string | null; install_source?: string | null } | null): boolean {
  return (
    !!profile?.role_slug &&
    CONTACT_ROUTED_ROLES.includes(profile.role_slug) &&
    profile.install_source === 'referral'
  );
}

/** The assigned promoter's contact — only populated for referral-installed buyers/sellers. */
export function usePromoterContact() {
  const profile = useAuth((s) => s.profile);
  return useQuery({
    queryKey: ['promoter_contact', profile?.id],
    queryFn: getMyPromoterContact,
    enabled: isReferralRouted(profile),
    staleTime: 5 * 60_000,
  });
}

/** Best-effort activity capture — a failed log must never block the contact action. */
export function logContactEvent(input: {
  target: 'jamin' | 'promoter';
  channel: 'call' | 'whatsapp' | 'email';
  propertyId?: string | null;
  promoterId?: string | null;
}) {
  void supabase
    .from('contact_events')
    .insert({
      target: input.target,
      channel: input.channel,
      property_id: input.propertyId ?? null,
      promoter_id: input.promoterId ?? null,
    })
    .then(() => {});
}

/** Best-effort brochure/document-open capture for the admin engagement view. */
export function logBrochureOpen(input: {
  title: string;
  url?: string | null;
  propertyId?: string | null;
  docId?: string | null;
}) {
  void supabase
    .from('brochure_downloads')
    .insert({
      title: input.title.slice(0, 200),
      url: input.url ?? null,
      property_id: input.propertyId ?? null,
      doc_id: input.docId ?? null,
    })
    .then(() => {});
}
