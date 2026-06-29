import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type BuyerRequirement = Database['public']['Tables']['buyer_requirements']['Row'];

export interface RequirementInput {
  label?: string;
  location?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  propertyTypeId?: string | null;
  minArea?: string;
  purpose?: string;
  notify?: boolean;
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
}

export async function getMyRequirements(): Promise<BuyerRequirement[]> {
  const { data, error } = await supabase
    .from('buyer_requirements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRequirement(input: RequirementInput) {
  const user_id = await uid();
  const { error } = await supabase.from('buyer_requirements').insert({
    user_id,
    label: input.label || null,
    location: input.location || null,
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    property_type_id: input.propertyTypeId ?? null,
    min_area: input.minArea || null,
    purpose: input.purpose || null,
    notify: input.notify ?? true,
  });
  if (error) throw error;
}

export async function deleteRequirement(id: string) {
  const { error } = await supabase.from('buyer_requirements').delete().eq('id', id);
  if (error) throw error;
}
