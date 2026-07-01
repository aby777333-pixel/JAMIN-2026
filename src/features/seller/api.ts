import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type PropertyInsert = Database['public']['Tables']['properties']['Insert'];

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
}

export async function getMyListingStats(): Promise<SellerListingStat[]> {
  const { data, error } = await supabase.rpc('seller_listing_stats');
  if (error) throw error;
  return (data ?? []) as unknown as SellerListingStat[];
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
}

/**
 * A seller submits a new listing. The DB guard forces approval_status='pending'
 * and seller_id=self, so the listing stays hidden from buyers until an admin
 * approves it in the web console (item 7-9). Descriptive fields go into attrs,
 * matching how the admin console stores guided specs.
 */
export async function createListing(input: CreateListingInput): Promise<string> {
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
  return (data as { plot_code: string }).plot_code;
}
