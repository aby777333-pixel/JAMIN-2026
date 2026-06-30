import { SITE_URL } from '@/lib/site';
import { supabase } from '@/lib/supabase';
import { uploadFileToBucket, uploadImageToBucket } from '@/lib/upload';

/**
 * The shareable ad opens a rich, interactive landing page so the recipient gets
 * the full experience (image + maps + tap-to-call + live chat + sender card +
 * referral QR) instead of a flat image. We host that page on the marketing site
 * (jaminproperties.co's DNS is not live yet — use the Netlify domain so the link
 * always resolves).
 */
export const AD_SITE = SITE_URL;

export interface PublishAdInput {
  uri: string;
  ownerId: string;
  place?: string | null;
  lat?: number;
  lng?: number;
  agentName?: string | null;
  agentPhone?: string | null;
  agentReferral?: string | null;
  capturedAt?: string | null;
  /** Optional source video — uploaded best-effort so the ad page can play it. */
  videoUri?: string;
  videoMime?: string;
}

function makeSlug(): string {
  const r = Math.random().toString(36).slice(2, 8);
  const t = Date.now().toString(36).slice(-3);
  return (r + t).toUpperCase();
}

/**
 * Uploads the composed ad PNG to the public `user-media` bucket, records a
 * `shared_ads` row, and returns the public landing-page URL to share.
 */
export async function publishAd(input: PublishAdInput): Promise<{ slug: string; url: string }> {
  const slug = makeSlug();
  const { url: imageUrl } = await uploadImageToBucket('user-media', `${input.ownerId}/ads`, {
    uri: input.uri,
    name: `ad_${slug}.png`,
    mimeType: 'image/png',
  });
  // Source video is optional + best-effort: a failed/oversized upload still ships the image ad.
  let videoUrl: string | null = null;
  if (input.videoUri) {
    try {
      const ext = (input.videoMime ?? 'video/mp4').split('/')[1] ?? 'mp4';
      const up = await uploadFileToBucket(
        'user-media',
        `${input.ownerId}/ads`,
        { uri: input.videoUri, name: `ad_${slug}.${ext}`, mimeType: input.videoMime ?? 'video/mp4' },
        `ad_${slug}.mp4`,
        'video/mp4',
      );
      videoUrl = up.url;
    } catch {
      videoUrl = null;
    }
  }
  const { error } = await supabase.from('shared_ads').insert({
    slug,
    owner_id: input.ownerId,
    image_url: imageUrl,
    video_url: videoUrl,
    place: input.place ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    agent_name: input.agentName ?? null,
    agent_phone: input.agentPhone ?? null,
    agent_referral: input.agentReferral ?? null,
    captured_at: input.capturedAt ?? null,
  });
  if (error) throw error;
  return { slug, url: `${AD_SITE}/ad/${slug}` };
}
