import { supabase } from '@/lib/supabase';

export interface TeamMember {
  id: string;
  full_name: string | null;
  referral_code: string;
  created_at: string;
  parent_id: string | null;
  role: { slug: string; name: string; level: number } | null;
}

/**
 * The caller's downline (§5.06 team hierarchy). RLS already limits profiles to
 * self ∪ subtree (hierarchy_path <@ my_path), so we just fetch and drop self.
 */
export async function getDownline(): Promise<TeamMember[]> {
  const { data: me } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, referral_code, created_at, parent_id, role:roles(slug,name,level)')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as TeamMember[];
  return rows.filter((r) => r.id !== me.user?.id);
}
