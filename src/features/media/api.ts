import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

export interface UserMedia {
  id: string;
  url: string;
  path: string;
  name: string | null;
  created_at: string;
}

const BUCKET = 'user-media';

/** Decode base64 → bytes (avoids a base64-arraybuffer dependency for RN uploads). */
function base64ToBytes(b64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  let len = b64.length * 0.75;
  if (b64[b64.length - 1] === '=') {
    len--;
    if (b64[b64.length - 2] === '=') len--;
  }
  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const e1 = lookup[b64.charCodeAt(i)];
    const e2 = lookup[b64.charCodeAt(i + 1)];
    const e3 = lookup[b64.charCodeAt(i + 2)];
    const e4 = lookup[b64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (b64[i + 2] !== '=') bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (b64[i + 3] !== '=') bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}

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

export async function uploadMedia(input: {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
}): Promise<UserMedia> {
  const uid = await currentUserId();
  const base64 = await FileSystem.readAsStringAsync(input.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);
  const safe = (input.name ?? 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${uid}/${Date.now()}_${safe}`;
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: input.mimeType ?? 'image/jpeg', upsert: false });
  if (up.error) throw up.error;
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { data, error } = await supabase
    .from('user_media')
    .insert({ url, path, name: input.name ?? safe })
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
