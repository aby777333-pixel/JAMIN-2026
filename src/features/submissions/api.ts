import * as Location from 'expo-location';

import { supabase } from '@/lib/supabase';
import { uploadImageToBucket, type PickedImage } from '@/lib/upload';

const BUCKET = 'property-submissions';

/**
 * Best-effort capture coordinates for geo-verification (0102). Never prompts —
 * only reads a fix when foreground permission was ALREADY granted (e.g. by
 * visit check-in) — and gives up after 3 s. Nulls on any failure: the upload
 * must never be blocked by location.
 */
async function bestEffortLocation(): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { lat: null, lng: null };
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    if (!pos) return { lat: null, lng: null };
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return { lat: null, lng: null };
  }
}

export interface MySubmission {
  id: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  property: { plot_code: string } | null;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
}

/** Partner submits one or more photos for a property → pending admin review. */
export async function submitPropertyPhotos(propertyId: string, assets: PickedImage[]): Promise<number> {
  const uid = await currentUserId();
  const { lat, lng } = await bestEffortLocation();
  let n = 0;
  for (const a of assets) {
    const { url, path, name } = await uploadImageToBucket(BUCKET, uid, a);
    const { error } = await supabase.from('property_media_submissions').insert({
      property_id: propertyId,
      url,
      path,
      name,
      lat,
      lng,
      captured_at: new Date().toISOString(),
    });
    if (error) throw error;
    n++;
  }
  return n;
}

/** The signed-in user's own submissions with their review status (RLS scopes to owner). */
export async function listMySubmissions(): Promise<MySubmission[]> {
  const { data, error } = await supabase
    .from('property_media_submissions')
    .select('id, url, status, created_at, property:properties(plot_code)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MySubmission[];
}
