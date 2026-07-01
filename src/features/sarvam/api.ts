import { supabase } from '@/lib/supabase';

export interface SarvamResult {
  configured: boolean;
  text?: string;
  message?: string;
  error?: string;
}

/** Sarvam-supported Indian languages (BCP-47 codes Sarvam expects). */
export const SARVAM_LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'മലയാളം' },
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'bn-IN', label: 'বাংলা' },
  { code: 'gu-IN', label: 'ગુજરાતી' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
] as const;

/** Translate text into an Indian language via the sarvam Edge Function (modular). */
export async function translateText(text: string, target: string, source = 'auto'): Promise<SarvamResult> {
  const { data, error } = await supabase.functions.invoke('sarvam', {
    body: { action: 'translate', text, target, source },
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
  return data as SarvamResult;
}
