import { supabase } from '@/lib/supabase';
import { uploadImageToBucket, type PickedImage } from '@/lib/upload';

const BUCKET = 'property-submissions';

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
  let n = 0;
  for (const a of assets) {
    const { url, path, name } = await uploadImageToBucket(BUCKET, uid, a);
    const { error } = await supabase
      .from('property_media_submissions')
      .insert({ property_id: propertyId, url, path, name });
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
