import { useQuery } from '@tanstack/react-query';

import * as api from './api';

/**
 * Fallback defaults — mirror the seeded `app_content` values so the app behaves
 * identically before content loads (or if a key is missing). Editing a value in
 * the admin console overrides these live.
 */
export const CONTENT_DEFAULTS: Record<string, string> = {
  'brand.tagline': 'Signature for Fortune',
  'brand.name': 'JAMIN PROPERTIES',
  'home.buyer_card_title': 'Find your next property',
  'home.buyer_card_body': 'Browse dynamic inventory, calculate EMI & ROI, and enquire or book a visit.',
  'support.hours': 'Mon–Sat, 10am–7pm IST',
  'social.website': 'https://jaminproperties.co',
  'calc.emi_down_pct': '20',
  'calc.emi_rate': '9',
  'calc.emi_years': '10',
  'calc.roi_appreciation': '8',
  'calc.roi_years': '5',
  'legal.privacy_url': 'https://jaminproperties.co/privacy',
  'kyc.intro': 'Verify your identity to unlock payouts',
  'kyc.pending_msg': "Your documents are under review. We'll notify you once approved.",
  'kyc.verified_msg': "You're verified. Nothing more to do here.",
};

export function useAppContent() {
  return useQuery({ queryKey: ['app-content'], queryFn: api.getAppContent, staleTime: 5 * 60_000 });
}

export function useAnnouncements() {
  return useQuery({ queryKey: ['announcements'], queryFn: api.getAnnouncements, staleTime: 60_000 });
}

/**
 * Returns a getter for content values with safe fallbacks.
 * `get(key, override?)` → admin value, else override, else seeded default, else ''.
 */
export function useContent() {
  const { data } = useAppContent();
  const get = (key: string, fallback?: string) =>
    data?.[key] ?? fallback ?? CONTENT_DEFAULTS[key] ?? '';
  return { get, map: data ?? {} };
}
