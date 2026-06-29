import { supabase } from '@/lib/supabase';

export interface SelectableRole {
  id: string;
  slug: string;
  name: string;
  level: number;
}

/** Roles a user may pick for themselves (self_selectable, non-admin). */
export async function getSelectableRoles(): Promise<SelectableRole[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('id, slug, name, level')
    .eq('self_selectable', true)
    .order('level', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SelectableRole[];
}

/** Switch the signed-in user's role (server validates it's self-selectable). */
export async function switchRole(slug: string): Promise<void> {
  const { error } = await supabase.rpc('switch_role', { p_slug: slug });
  if (error) throw error;
}
