import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

/**
 * Sanctioned layouts as selectable inventory.
 *
 * Everything comes from the `layout_overview` read model in one round trip, so
 * the plan, the plot schedule and live availability always agree. Plot geometry
 * is traced from the approval drawing (see scripts/extract-dtcp-layout.py) and
 * is display-only — quoted sizes and areas come from the sanctioned schedule.
 */

export const PLOT_STATUSES = ['available', 'reserved', 'booked', 'sold', 'blocked'] as const;
export type PlotStatus = (typeof PLOT_STATUSES)[number];

export const PAYMENT_METHODS = ['upi', 'bank_transfer', 'net_banking'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Road each plot fronts. Read off the plan — not stated on the DTCP sheet. */
export type PlotFacing = 'north' | 'south' | 'east' | 'west';

export interface LayoutPlot {
  id: string;
  number: number;
  block: string;
  /** [x0, y0, x1, y1] in the drawing's user space. */
  rect: [number, number, number, number];
  widthM: number | null;
  depthM: number | null;
  areaSqm: number | null;
  facing: PlotFacing | null;
  isCorner: boolean;
  roadWidthM: number | null;
  status: PlotStatus;
  price: number | null;
  offerPrice: number | null;
  bookingAmount: number | null;
  registrationCharges: number;
  developmentCharges: number;
  totalCost: number;
  media: Array<{ url: string } | string>;
  documents: Array<{ name?: string; url: string }>;
}

export interface LayoutGeometry {
  viewBox: [number, number, number, number];
  boundary: Array<[number, number]>;
  osr: { rect: [number, number, number, number]; polygon: Array<[number, number]>; areaSqm: number; label: string };
  existingRoad: { quad: Array<[number, number]>; label: string; widthM: number };
  roads: Array<{ label: string; widthM: number; band: [number, number, number, number]; rotate?: number }>;
  dimensions: Array<{ label: string; from: [number, number]; to: [number, number] }>;
  areaStatement: Array<{ label: string; areaSqm: number; percent: number }>;
  notes: string[];
  totalPlots: number;
  /** Metres represented by one drawing unit — drives the scale bar. */
  metresPerUnit?: number;
  /**
   * Outline actually drawn per plot number, clipped to the site boundary
   * exactly as the approval sheet clips it. Draw this, not `rect`.
   */
  plotShapes?: Record<string, { poly: Array<[number, number]>; at: [number, number]; clipped: boolean }>;
}

export interface LayoutHeader {
  id: string;
  slug: string;
  name: string;
  authority: string | null;
  title: string | null;
  place: string | null;
  approvalNo: string | null;
  approvalDate: string | null;
  owner: string | null;
  surveyNos: string | null;
  village: string | null;
  taluk: string | null;
  district: string | null;
  scale: string | null;
  geometry: LayoutGeometry;
  amenities: Array<{ kind: string; label: string; icon?: string; at?: [number, number] }>;
  media: Array<{ url: string } | string>;
  documents: Array<{ name?: string; url: string }>;
  brochureUrl: string | null;
  mapsUrl: string | null;
  streetViewUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  landmarks: Array<{ name: string; distance?: string }>;
  holdMinutes: number;
}

export interface LayoutSummary {
  total: number;
  available: number;
  reserved: number;
  booked: number;
  sold: number;
  blocked: number;
}

export interface LayoutOverview {
  layout: LayoutHeader;
  plots: LayoutPlot[];
  summary: LayoutSummary;
}

/** The whole plan + live availability in one call. Null when not published. */
export async function getLayout(slug: string): Promise<LayoutOverview | null> {
  const { data, error } = await supabase.rpc('layout_overview', { p_slug: slug });
  if (error) throw error;
  return (data as unknown as LayoutOverview | null) ?? null;
}

/** Layouts the caller can see, for the picker. */
export async function listLayouts() {
  const { data, error } = await supabase
    .from('layouts')
    .select('id, slug, name, place, approval_no, is_published, status')
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export interface HoldResult {
  bookingRef: string;
  bookingId: string;
  plotId: string;
  plotNumber: number;
  amount: number;
  expiresAt: string;
  method: PaymentMethod;
}

/**
 * Put a plot on hold. This moves no money: JAMIN has no payment gateway, so the
 * hold records the buyer's intent and the booking amount is then transferred
 * manually and verified by an admin (the bank-transfer flow from 0087).
 */
export async function reservePlot(
  plotId: string,
  method: PaymentMethod,
  note?: string,
): Promise<HoldResult> {
  const { data, error } = await supabase.rpc('reserve_layout_plot', {
    p_plot: plotId,
    p_method: method,
    p_note: note,
  });
  if (error) throw error;
  return data as unknown as HoldResult;
}

/** Give a hold back. Buyers may only release their own. */
export async function releasePlot(plotId: string): Promise<void> {
  const { error } = await supabase.rpc('release_layout_plot', { p_plot: plotId });
  if (error) throw error;
}

/** Holds and confirmed bookings belonging to the signed-in buyer. */
export async function listMyPlotBookings() {
  const { data, error } = await supabase
    .from('layout_bookings')
    .select('id, booking_ref, plot_id, layout_id, amount, payment_method, status, expires_at, confirmed_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── admin ──────────────────────────────────────────────────────────────────

export async function setPlotStatus(plotId: string, status: PlotStatus, note?: string) {
  const { error } = await supabase.rpc('admin_set_layout_plot_status', {
    p_plot: plotId,
    p_status: status,
    p_note: note,
  });
  if (error) throw error;
}

export interface PlotPatch {
  price?: number;
  offerPrice?: number | null;
  bookingAmount?: number;
  registrationCharges?: number;
  developmentCharges?: number;
  facing?: PlotFacing;
  isCorner?: boolean;
  roadWidthM?: number;
  media?: Array<{ url: string }>;
  documents?: Array<{ name?: string; url: string }>;
  note?: string;
}

export async function updatePlot(plotId: string, patch: PlotPatch) {
  const { error } = await supabase.rpc('admin_update_layout_plot', {
    p_plot: plotId,
    p_patch: patch as unknown as Json,
  });
  if (error) throw error;
}

/** Price a whole block at once; pass block = null for the entire layout. */
export async function priceBlock(layoutId: string, block: string | null, patch: PlotPatch) {
  const { data, error } = await supabase.rpc('admin_price_layout_block', {
    p_layout: layoutId,
    p_block: block,
    p_patch: patch as unknown as Json,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}
