import { supabase } from '@/lib/supabase';

export interface SarvamResult {
  configured: boolean;
  text?: string;
  message?: string;
  error?: string;
}

/**
 * All languages Sarvam's translate model (sarvam-translate:v1) supports — the 22
 * scheduled Indian languages + English. Verified live against the API.
 */
export const SARVAM_LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'bn-IN', label: 'বাংলা' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'മലയാളം' },
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'gu-IN', label: 'ગુજરાતી' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
  { code: 'od-IN', label: 'ଓଡ଼ିଆ' },
  { code: 'ur-IN', label: 'اردو' },
  { code: 'as-IN', label: 'অসমীয়া' },
  { code: 'ne-IN', label: 'नेपाली' },
  { code: 'sa-IN', label: 'संस्कृतम्' },
  { code: 'kok-IN', label: 'कोंकणी' },
  { code: 'mai-IN', label: 'मैथिली' },
  { code: 'doi-IN', label: 'डोगरी' },
  { code: 'ks-IN', label: 'کٲشُر' },
  { code: 'sd-IN', label: 'सिन्धी' },
  { code: 'sat-IN', label: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'mni-IN', label: 'মৈতৈলোন্' },
  { code: 'brx-IN', label: 'बड़ो' },
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

export interface SarvamChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SarvamSttResult extends SarvamResult {
  language_code?: string | null;
}

export interface SarvamTtsResult {
  configured: boolean;
  audio_base64?: string;
  mime?: string;
  message?: string;
  error?: string;
}

/** Speech-to-text (saarika:v2.5) — base64 audio in, transcript out. Auto-detects the language. */
export async function speechToText(audioBase64: string, mime = 'audio/mp4'): Promise<SarvamSttResult> {
  const { data, error } = await supabase.functions.invoke('sarvam', {
    body: { action: 'stt', audio_base64: audioBase64, mime },
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
  return data as SarvamSttResult;
}

/** Text-to-speech (bulbul:v2) — returns base64 WAV audio in the target language. */
export async function textToSpeech(text: string, target: string): Promise<SarvamTtsResult> {
  const { data, error } = await supabase.functions.invoke('sarvam', {
    body: { action: 'tts', text, target },
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
  return data as SarvamTtsResult;
}

/**
 * Indian-language AI chat via the sarvam Edge Function (Sarvam-M). `language` is a
 * human label (e.g. "हिन्दी") that nudges the reply language. Inert until a Sarvam
 * key is configured server-side (returns { configured:false, message }).
 */
export async function chatWithSarvam(messages: SarvamChatMessage[], language?: string): Promise<SarvamResult> {
  const { data, error } = await supabase.functions.invoke('sarvam', {
    body: { action: 'chat', messages, language },
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
