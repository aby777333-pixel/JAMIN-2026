import { supabase } from '@/lib/supabase';

export type ContentMap = Record<string, string>;

/** All admin-editable app strings/config, as a key→value map. */
export async function getAppContent(): Promise<ContentMap> {
  const { data, error } = await supabase.from('app_content').select('key, value');
  if (error) throw error;
  const out: ContentMap = {};
  (data ?? []).forEach((r) => {
    if (r.value != null && r.value !== '') out[r.key] = r.value;
  });
  return out;
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  audience: string;
  sort_order: number;
}

/** Active Home banners, ordered. Empty when none — the rail simply hides. */
export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, image_url, cta_label, cta_url, audience, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}
