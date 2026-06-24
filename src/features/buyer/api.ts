import { supabase } from '@/lib/supabase';
import type {
  FormField,
  PropertyDetail,
  PropertyFilters,
  PropertyListItem,
} from './types';

const LIST_SELECT =
  'id, plot_code, price, status, media, attrs, coordinates, project:projects(name,code,location), type:property_types(slug,name)';

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export async function listProperties(filters: PropertyFilters): Promise<PropertyListItem[]> {
  // Saved-only: resolve wishlisted property ids first, then constrain.
  let savedIds: string[] | null = null;
  if (filters.savedOnly) {
    savedIds = [...(await getWishlistIds())];
    if (savedIds.length === 0) return [];
  }

  let q = supabase.from('properties').select(LIST_SELECT).order('plot_code', { ascending: true });

  q = q.eq('status', filters.status ?? 'available');
  if (filters.propertyTypeId) q = q.eq('property_type_id', filters.propertyTypeId);
  if (filters.projectId) q = q.eq('project_id', filters.projectId);
  if (filters.priceMin != null) q = q.gte('price', filters.priceMin);
  if (filters.priceMax != null) q = q.lte('price', filters.priceMax);
  if (filters.search && filters.search.trim()) q = q.ilike('plot_code', `%${filters.search.trim()}%`);
  if (savedIds) q = q.in('id', savedIds);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PropertyListItem[];
}

export async function getProperty(id: string): Promise<PropertyDetail | null> {
  const { data, error } = await supabase
    .from('properties')
    .select(`${LIST_SELECT}, project_id, plan_id, property_type_id, plan:plans(name)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PropertyDetail) ?? null;
}

/** Newest available listings for the Home "Featured" rail — showcases admin uploads. */
export async function getFeaturedProperties(limit = 8): Promise<PropertyListItem[]> {
  const { data, error } = await supabase
    .from('properties')
    .select(LIST_SELECT)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PropertyListItem[];
}

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, code, location')
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getProjectById(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, code, location, status')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  code: string | null;
  location: string | null;
  available: number;
}

/** Active projects (admin-uploaded) with a live count of available plots each. */
export async function getProjectsWithCounts(): Promise<ProjectSummary[]> {
  const [projectsRes, propsRes] = await Promise.all([
    supabase.from('projects').select('id, name, code, location').eq('status', 'active').order('name'),
    supabase.from('properties').select('project_id').eq('status', 'available'),
  ]);
  if (projectsRes.error) throw projectsRes.error;
  if (propsRes.error) throw propsRes.error;
  const counts: Record<string, number> = {};
  for (const row of propsRes.data ?? []) {
    const k = (row as { project_id: string | null }).project_id;
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  }
  return (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    code: (p.code as string) ?? null,
    location: (p.location as string) ?? null,
    available: counts[p.id as string] ?? 0,
  }));
}

export async function getPropertyTypes() {
  const { data, error } = await supabase
    .from('property_types')
    .select('id, slug, name, code_prefix')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getWishlistIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('wishlists').select('property_id');
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.property_id));
}

export async function addWishlist(propertyId: string) {
  const user_id = await currentUserId();
  const { error } = await supabase
    .from('wishlists')
    .upsert({ user_id, property_id: propertyId }, { onConflict: 'user_id,property_id' });
  if (error) throw error;
}

export async function removeWishlist(propertyId: string) {
  const user_id = await currentUserId();
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', user_id)
    .eq('property_id', propertyId);
  if (error) throw error;
}

/** The buyer enquiry form is dynamic — defined in form_definitions (§11). */
export async function getBuyerForm(): Promise<FormField[]> {
  const { data, error } = await supabase
    .from('form_definitions')
    .select('fields')
    .eq('key', 'buyer')
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return ((data?.fields as FormField[] | undefined) ?? []).filter(Boolean);
}

export async function createEnquiry(input: {
  propertyId: string;
  name: string;
  phone: string;
  answers: Record<string, unknown>;
}) {
  const owner_id = await currentUserId();
  const { error } = await supabase.from('leads').insert({
    owner_id,
    property_id: input.propertyId,
    source: 'enquiry',
    status: 'new',
    contact: { name: input.name, phone: input.phone, ...input.answers },
  });
  if (error) throw error;
}

export async function bookSiteVisit(input: { propertyId: string; scheduledAt: string }) {
  const buyer_id = await currentUserId();
  const { error } = await supabase.from('bookings').insert({
    property_id: input.propertyId,
    buyer_id,
    status: 'site_visit',
    schedule: input.scheduledAt,
  });
  if (error) throw error;
}

export async function reserveProperty(input: { propertyId: string; amount: number }) {
  const buyer_id = await currentUserId();
  const { error } = await supabase.from('bookings').insert({
    property_id: input.propertyId,
    buyer_id,
    status: 'reserved',
    amount: input.amount,
  });
  if (error) throw error;
}
