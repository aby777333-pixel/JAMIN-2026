import type { Profile } from '@/types/domain';

/**
 * Role-based capabilities (§ tiered access). The 7 ranks gate features by the
 * role's hierarchy level (super_admin=1 … buyer=7) — lower level = higher rank.
 * Data is additionally scoped server-side by RLS (you only ever see your own
 * subtree / leads / wallet); this controls which features each rank can reach.
 */
export type Capability =
  | 'sell' //          sales toolkit: Leads/CRM, Create Ad, Brochures, AI Studio, Rewards, Wallet, Bookings, Card
  | 'recruit' //       grow a downline / invite partners
  | 'team' //          view own downline (Network)
  | 'teamAnalytics' // team performance rollups, assign leads to team
  | 'region' //        region-wide oversight (own territory)
  | 'state' //         state-wide oversight
  | 'admin'; //        Admin Portal + approvals

/** Highest role level (inclusive) that still holds the capability. */
const CAP_MAX_LEVEL: Record<Capability, number> = {
  sell: 6, //          Agent and up
  team: 5, //          Sub Promoter and up
  recruit: 5, //       Sub Promoter and up
  teamAnalytics: 4, //  Promoter and up
  region: 3, //        Regional Manager and up
  state: 2, //         State Head and up
  admin: 1, //         Super Admin
};

/**
 * User types surfaced in in-app role LISTS (pickers, preview, applications) per
 * the owner's role model: Super Admin (full access), Promoter, Sub Promoter,
 * Agent/Broker, Seller, Buyer. Other DB roles keep working for existing users —
 * they are only hidden from lists, never removed.
 */
export const VISIBLE_ROLE_SLUGS = ['super_admin', 'promoter', 'sub_promoter', 'agent', 'broker', 'seller', 'buyer'] as const;

export function isVisibleRole(slug: string | null | undefined): boolean {
  return !!slug && (VISIBLE_ROLE_SLUGS as readonly string[]).includes(slug);
}

type ProfileLike = Pick<Profile, 'role_level' | 'role_is_admin'> | null | undefined;

/** Whether a profile's rank can use a capability. Super Admin can do everything. */
export function can(profile: ProfileLike, cap: Capability): boolean {
  if (!profile) return false;
  if (profile.role_is_admin) return true;
  const level = profile.role_level;
  return level != null && level <= CAP_MAX_LEVEL[cap];
}
