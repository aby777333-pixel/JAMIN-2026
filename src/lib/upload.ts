import * as FileSystem from 'expo-file-system/legacy';

import { base64ToBytes } from '@/lib/base64';
import { supabase } from '@/lib/supabase';

export interface PickedImage {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
}

/** Upload a picked image to a public Storage bucket under `<folder>/…`; returns its public URL + path. */
export async function uploadImageToBucket(
  bucket: string,
  folder: string,
  input: PickedImage,
): Promise<{ url: string; path: string; name: string }> {
  const base64 = await FileSystem.readAsStringAsync(input.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);
  const safe = (input.name ?? 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${safe}`;
  const up = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: input.mimeType ?? 'image/jpeg', upsert: false });
  if (up.error) throw up.error;
  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { url, path, name: input.name ?? safe };
}
