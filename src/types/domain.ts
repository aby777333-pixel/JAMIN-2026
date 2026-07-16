/**
 * Domain types. NOTE (SuperPrompt §13): roles, hierarchy, commissions, projects
 * and property types are DYNAMIC — defined in DB tables, never hardcoded enums.
 * The slugs below are the demo-seed defaults only, typed loosely so adding a new
 * role at runtime never requires a code change.
 */
export type RoleSlug =
  | 'super_admin'
  | 'state_head'
  | 'regional_manager'
  | 'promoter'
  | 'sub_promoter'
  | 'agent'
  | 'buyer'
  | (string & {});

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type PlotStatus = 'available' | 'reserved' | 'sold';

export interface Profile {
  id: string;
  role_id: string | null;
  role_slug: RoleSlug | null;
  role_is_admin: boolean;
  /** Rank in the hierarchy (1 = Super Admin … 7 = Buyer). Drives capability gating. */
  role_level: number | null;
  parent_id: string | null;
  hierarchy_path: string | null;
  referral_code: string;
  designation: string | null;
  full_name: string | null;
  photo_url: string | null;
  phone: string | null;
  phone_verified: boolean;
  email: string | null;
  kyc_status: KycStatus;
  territory_id: string | null;
  language: string;
  /** Faith/tradition for personalised dates & checklists (0071); null = not chosen. */
  tradition?: string | null;
  /** How the app was installed (0099): 'direct' store download or promoter 'referral'. */
  install_source?: 'direct' | 'referral' | null;
  /** Promoter the buyer is bound to for contact routing (0099); admin-changeable. */
  assigned_promoter_id?: string | null;
  status: string;
  created_at: string;
}
