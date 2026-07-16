export type PropertyStatus = 'available' | 'reserved' | 'sold';

export interface PropertyRef {
  name: string;
  code?: string;
  location?: string | null;
  // RERA (migration 0047) — optional so existing selects stay valid.
  rera_number?: string | null;
  rera_status?: string | null;
  rera_valid_till?: string | null;
  neighborhood?: Record<string, number> | null;
}

export interface PropertyListItem {
  id: string;
  plot_code: string;
  price: number;
  status: PropertyStatus;
  media: unknown;
  attrs: Record<string, unknown>;
  coordinates: { lat?: number; lng?: number } | null;
  project: PropertyRef | null;
  type: { slug: string; name: string } | null;
  // Verification & approval (migration 0037) — optional so existing selects stay valid.
  approval_status?: string;
  verified_seller?: boolean;
  verified_documents?: boolean;
  verified_location?: boolean;
  is_premium?: boolean;
  seller_id?: string | null;
  created_at?: string;
}

export interface PropertyDetail extends PropertyListItem {
  project_id: string;
  plan_id: string | null;
  property_type_id: string;
  plan: { name: string } | null;
  /** Admin's review note (0037/0101) — shown only to the listing's own seller. */
  approval_note?: string | null;
}

export interface PropertyFilters {
  search?: string;
  propertyTypeId?: string | null;
  projectId?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  status?: PropertyStatus;
  savedOnly?: boolean;
  premiumOnly?: boolean;
  verifiedOnly?: boolean;
  /** Vastu facing (matches attrs.Facing, e.g. 'North-East'). */
  facing?: string | null;
  sort?: 'plot' | 'price_asc' | 'price_desc' | 'newest';
  // ── Advanced filters (0100 round). Column-backed ones run server-side;
  //    attrs-backed ones are applied client-side after the fetch, because
  //    attrs keys are admin-defined free text (dynamic rule §13).
  verifiedDocsOnly?: boolean;
  newOnly?: boolean;
  priceReducedOnly?: boolean;
  bedroomsMin?: number | null;
  bathroomsMin?: number | null;
  cornerOnly?: boolean;
  gatedOnly?: boolean;
  furnishing?: string | null;
  parkingOnly?: boolean;
  waterOnly?: boolean;
  roadWidthMin?: number | null;
  possession?: 'ready' | 'under_construction' | null;
  saleType?: 'new' | 'resale' | null;
  listedBy?: 'owner' | 'agent' | null;
  loanEligibleOnly?: boolean;
  areaMin?: number | null;
  areaMax?: number | null;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}
