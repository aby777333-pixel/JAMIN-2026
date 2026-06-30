import { supabase } from '@/lib/supabase';
import { uploadFileToBucket } from '@/lib/upload';

export interface Reel {
  id: string;
  video_url: string;
  poster_url: string | null;
  caption: string | null;
  property_id: string | null;
  created_at: string;
  user: { full_name: string | null } | null;
  property: { plot_code: string; project: { name: string } | null } | null;
}

export async function listReels(): Promise<Reel[]> {
  const { data, error } = await supabase
    .from('property_reels')
    .select('id, video_url, poster_url, caption, property_id, created_at, user:profiles!property_reels_user_id_fkey(full_name), property:properties(plot_code, project:projects(name))')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as Reel[];
}

export async function addReel(input: {
  videoUri: string;
  videoMime?: string | null;
  posterUri?: string | null;
  caption?: string;
  propertyId?: string | null;
}) {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) throw new Error('Not signed in');
  const ext = (input.videoMime ?? 'video/mp4').split('/')[1] ?? 'mp4';
  const vid = await uploadFileToBucket(
    'user-media',
    `${me.user.id}/reels`,
    { uri: input.videoUri, name: `reel_${Date.now()}.${ext}`, mimeType: input.videoMime ?? 'video/mp4' },
    'reel.mp4',
    'video/mp4',
  );
  let posterUrl: string | null = null;
  if (input.posterUri) {
    try {
      const p = await uploadFileToBucket(
        'user-media',
        `${me.user.id}/reels`,
        { uri: input.posterUri, name: `reel_${Date.now()}.jpg`, mimeType: 'image/jpeg' },
        'reel.jpg',
        'image/jpeg',
      );
      posterUrl = p.url;
    } catch {
      posterUrl = null;
    }
  }
  const { error } = await supabase.from('property_reels').insert({
    user_id: me.user.id,
    property_id: input.propertyId ?? null,
    video_url: vid.url,
    poster_url: posterUrl,
    caption: input.caption || null,
  });
  if (error) throw error;
}

export async function deleteReel(id: string) {
  const { error } = await supabase.from('property_reels').delete().eq('id', id);
  if (error) throw error;
}
