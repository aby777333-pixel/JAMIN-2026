import { supabase } from '@/lib/supabase';
import { uploadImageToBucket, type PickedImage } from '@/lib/upload';

export interface UserMedia {
  id: string;
  url: string;
  path: string;
  name: string | null;
  created_at: string;
}

const BUCKET = 'user-media';

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
}

/** The signed-in user's own image library (RLS scopes to owner). */
export async function listMyMedia(): Promise<UserMedia[]> {
  const { data, error } = await supabase
    .from('user_media')
    .select('id, url, path, name, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserMedia[];
}

export async function uploadMedia(input: PickedImage): Promise<UserMedia> {
  const uid = await currentUserId();
  const { url, path, name } = await uploadImageToBucket(BUCKET, uid, input);
  const { data, error } = await supabase
    .from('user_media')
    .insert({ url, path, name })
    .select('id, url, path, name, created_at')
    .single();
  if (error) throw error;
  return data as UserMedia;
}

export async function deleteMedia(item: UserMedia): Promise<void> {
  await supabase.storage.from(BUCKET).remove([item.path]);
  const { error } = await supabase.from('user_media').delete().eq('id', item.id);
  if (error) throw error;
}
