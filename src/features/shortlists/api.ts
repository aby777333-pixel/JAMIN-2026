import { supabase } from '@/lib/supabase';

export interface Shortlist {
  id: string;
  name: string;
  owner_id: string;
  share_token: string;
  item_count: number;
}

export interface ShortlistComment {
  id: string;
  item_id: string;
  body: string;
  created_at: string;
  user: { full_name: string | null } | null;
}

export interface ShortlistItem {
  id: string;
  property_id: string;
  property: { plot_code: string; price: number; media: unknown; project: { name: string } | null } | null;
  up: number;
  down: number;
  myVote: number; // -1, 0, 1
  comments: ShortlistComment[];
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
}

export async function listMyShortlists(): Promise<Shortlist[]> {
  const { data, error } = await supabase
    .from('shortlists')
    .select('id, name, owner_id, share_token, shortlist_items(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as (Omit<Shortlist, 'item_count'> & { shortlist_items: { count: number }[] })[]).map(
    (s) => ({
      id: s.id,
      name: s.name,
      owner_id: s.owner_id,
      share_token: s.share_token,
      item_count: s.shortlist_items?.[0]?.count ?? 0,
    }),
  );
}

export async function createShortlist(name: string): Promise<Shortlist> {
  const owner_id = await uid();
  const { data, error } = await supabase
    .from('shortlists')
    .insert({ name, owner_id })
    .select('id, name, owner_id, share_token')
    .single();
  if (error) throw error;
  return { ...(data as Omit<Shortlist, 'item_count'>), item_count: 0 };
}

export async function joinShortlist(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_shortlist', { p_token: token.trim() });
  if (error) throw error;
  return data as string;
}

export async function getShortlist(id: string): Promise<Shortlist | null> {
  const { data, error } = await supabase
    .from('shortlists')
    .select('id, name, owner_id, share_token, shortlist_items(count)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const s = data as unknown as Omit<Shortlist, 'item_count'> & { shortlist_items: { count: number }[] };
  return { id: s.id, name: s.name, owner_id: s.owner_id, share_token: s.share_token, item_count: s.shortlist_items?.[0]?.count ?? 0 };
}

export async function getShortlistItems(shortlistId: string): Promise<ShortlistItem[]> {
  const me = await uid();
  const { data: rows, error } = await supabase
    .from('shortlist_items')
    .select('id, property_id, property:properties(plot_code, price, media, project:projects(name))')
    .eq('shortlist_id', shortlistId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const items = (rows ?? []) as unknown as { id: string; property_id: string; property: ShortlistItem['property'] }[];
  const ids = items.map((i) => i.id);
  if (ids.length === 0) return [];

  const [{ data: votes }, { data: comments }] = await Promise.all([
    supabase.from('shortlist_votes').select('item_id, value, user_id').in('item_id', ids),
    supabase
      .from('shortlist_comments')
      .select('id, item_id, body, created_at, user:profiles!shortlist_comments_user_id_fkey(full_name)')
      .in('item_id', ids)
      .order('created_at', { ascending: true }),
  ]);

  const vRows = (votes ?? []) as { item_id: string; value: number; user_id: string }[];
  const cRows = (comments ?? []) as unknown as ShortlistComment[];
  return items.map((it) => {
    const mine = vRows.find((v) => v.item_id === it.id && v.user_id === me);
    return {
      id: it.id,
      property_id: it.property_id,
      property: it.property,
      up: vRows.filter((v) => v.item_id === it.id && v.value === 1).length,
      down: vRows.filter((v) => v.item_id === it.id && v.value === -1).length,
      myVote: mine?.value ?? 0,
      comments: cRows.filter((c) => c.item_id === it.id),
    };
  });
}

export async function addShortlistItem(shortlistId: string, propertyId: string) {
  const added_by = await uid();
  const { error } = await supabase
    .from('shortlist_items')
    .upsert({ shortlist_id: shortlistId, property_id: propertyId, added_by }, { onConflict: 'shortlist_id,property_id' });
  if (error) throw error;
}

export async function removeShortlistItem(itemId: string) {
  const { error } = await supabase.from('shortlist_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function voteShortlistItem(itemId: string, value: -1 | 1) {
  const user_id = await uid();
  const { error } = await supabase
    .from('shortlist_votes')
    .upsert({ item_id: itemId, user_id, value }, { onConflict: 'item_id,user_id' });
  if (error) throw error;
}

export async function commentShortlistItem(itemId: string, body: string) {
  const user_id = await uid();
  const { error } = await supabase.from('shortlist_comments').insert({ item_id: itemId, user_id, body });
  if (error) throw error;
}
