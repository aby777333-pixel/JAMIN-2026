import { supabase } from '@/lib/supabase';

export interface BrandVideoResult {
  configured: boolean;
  url?: string;
  message?: string;
  error?: string;
}

/**
 * Server-rendered branded video — overlays a branding image onto a video via the
 * video-brand Edge Function (Cloudinary). Both inputs must be public URLs.
 * Inert (configured:false) until a Cloudinary account is set in app_secrets.
 */
export async function brandVideo(videoUrl: string, overlayUrl: string): Promise<BrandVideoResult> {
  const { data, error } = await supabase.functions.invoke('video-brand', {
    body: { videoUrl, overlayUrl },
  });
  if (error) {
    let message = error.message;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (error as any).context?.json?.();
      if (body?.message || body?.error) message = body.message ?? body.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return data as BrandVideoResult;
}
