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
  status: string;
  created_at: string;
}
