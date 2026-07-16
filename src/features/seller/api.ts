import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type Json = Database['public']['Tables']['properties']['Row']['attrs'];

/** Per-listing engagement stats for the signed-in seller (RPC seller_listing_stats). */
export interface SellerListingStat {
  property_id: string;
  plot_code: string;
  status: string;
  approval_status: string;
  price: number;
  views: number;
  enquiries: number;
  saves: number;
  bookings: number;
  offers: number;
  /** Lifecycle fields (0101) — merged from properties; not part of the stats RPC. */
  is_hidden?: boolean;
  archived_at?: string | null;
  approval_note?: string | null;
}

export async function getMyListingStats(): Promise<SellerListingStat[]> {
  const { data, error } = await supabase.rpc('seller_listing_stats');
  if (error) throw error;
  const stats = (data ?? []) as unknown as SellerListingStat[];
  if (stats.length === 0) return stats;

  // Additive merge (0101): the stats RPC predates the lifecycle columns, so
  // pull is_hidden/archived_at/approval_note straight from properties (RLS
  // lets the seller read their own rows even when hidden/archived).
  const { data: extras, error: extrasError } = await supabase
    .from('properties')
    .select('id, is_hidden, archived_at, approval_note')
    .in('id', stats.map((s) => s.property_id));
  if (extrasError) throw extrasError;
  const byId = new Map(
    (extras ?? []).map((e) => [e.id, e] as const),
  );
  return stats.map((s) => {
    const e = byId.get(s.property_id);
    return e
      ? { ...s, is_hidden: e.is_hidden, archived_at: e.archived_at, approval_note: e.approval_note }
      : s;
  });
}

/** Fields a seller may edit on their own listing (0101). Approval/verification
 *  columns are silently protected by a DB guard trigger. */
export interface ListingPatch {
  price?: number;
  attrs?: Json;
  is_hidden?: boolean;
  archived_at?: string | null;
  renewed_at?: string | null;
  status?: 'available' | 'reserved' | 'sold' | 'rented';
}

export async function updateListing(id: string, patch: ListingPatch): Promise<void> {
  // Whitelist — never let stray keys (e.g. approval_status) reach the update.
  const body: ListingPatch = {};
  if (patch.price !== undefined) body.price = patch.price;
  if (patch.attrs !== undefined) body.attrs = patch.attrs;
  if (patch.is_hidden !== undefined) body.is_hidden = patch.is_hidden;
  if (patch.archived_at !== undefined) body.archived_at = patch.archived_at;
  if (patch.renewed_at !== undefined) body.renewed_at = patch.renewed_at;
  if (patch.status !== undefined) body.status = patch.status;
  const { error } = await supabase.from('properties').update(body).eq('id', id);
  if (error) throw error;
}

/** One of the signed-in seller's own listings (RLS returns nothing for other sellers'). */
export interface MyListing {
  id: string;
  plot_code: string;
  price: number;
  status: string;
  approval_status: string;
  approval_note: string | null;
  is_hidden: boolean;
  archived_at: string | null;
  attrs: Json;
  media: Json;
}

export async function getMyListing(id: string): Promise<MyListing | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, plot_code, price, status, approval_status, approval_note, is_hidden, archived_at, attrs, media')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as MyListing | null) ?? null;
}

export interface CreateListingInput {
  projectId: string;
  propertyTypeId: string;
  planId?: string | null;
  price: number;
  title?: string;
  description?: string;
  address?: string;
  zoning?: string;
  ownership?: string;
  area?: string;
  facing?: string;
  lat?: number | null;
  lng?: number | null;
  /** Indian land-record details — shown on the listing like any other attr. */
  surveyNo?: string;
  pattaNo?: string;
  khataNo?: string;
  dtcpNo?: string;
}

/**
 * A seller submits a new listing. The DB guard forces approval_status='pending'
 * and seller_id=self, so the listing stays hidden from buyers until an admin
 * approves it in the web console (item 7-9). Descriptive fields go into attrs,
 * matching how the admin console stores guided specs. Returns the new row's id
 * (so photos/videos can be attached right away) and its plot code.
 */
export async function createListing(
  input: CreateListingInput,
): Promise<{ id: string; plot_code: string }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Not signed in');

  const attrs: Record<string, string> = {};
  if (input.title) attrs.title = input.title;
  if (input.description) attrs.description = input.description;
  if (input.address) attrs['Full address'] = input.address;
  if (input.zoning) attrs['Land category / zoning'] = input.zoning;
  if (input.ownership) attrs['Ownership / document status'] = input.ownership;
  if (input.area) attrs['Plot area'] = input.area;
  if (input.facing) attrs['Facing'] = input.facing;
  if (input.surveyNo) attrs['Survey number'] = input.surveyNo;
  if (input.pattaNo) attrs['Patta number'] = input.pattaNo;
  if (input.khataNo) attrs['Khata number'] = input.khataNo;
  if (input.dtcpNo) attrs['DTCP / layout approval no.'] = input.dtcpNo;

  const body: PropertyInsert = {
    project_id: input.projectId,
    property_type_id: input.propertyTypeId,
    price: input.price,
    seller_id: u.user.id,
    attrs,
    // plot_code is auto-assigned by the DB trigger when blank (0003).
    plot_code: '',
  };
  if (input.planId) body.plan_id = input.planId;
  if (input.lat != null && input.lng != null) body.coordinates = { lat: input.lat, lng: input.lng };

  const { data, error } = await supabase
    .from('properties')
    .insert(body)
    .select('id, plot_code')
    .single();
  if (error) throw error;
  return data as { id: string; plot_code: string };
}
