import { supabase } from '@/lib/supabase';

export interface SelectableRole {
  id: string;
  slug: string;
  name: string;
  level: number;
}

/**
 * Roles a user may pick for themselves (self_selectable, non-admin).
 * Uses a SECURITY DEFINER RPC so it works for anonymous visitors too (the roles
 * table is authenticated-only under RLS) — e.g. on the registration screen.
 */
export async function getSelectableRoles(): Promise<SelectableRole[]> {
  const { data, error } = await supabase.rpc('public_selectable_roles');
  if (error) throw error;
  return (data ?? []) as SelectableRole[];
}

/** Switch the signed-in user's role (server validates it's self-selectable). */
export async function switchRole(slug: string): Promise<void> {
  const { error } = await supabase.rpc('switch_role', { p_slug: slug });
  if (error) throw error;
}
