import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Alert, Linking, Share } from 'react-native';

import { supabase } from '@/lib/supabase';

export type Channel =
  | 'whatsapp'
  | 'telegram'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'sms'
  | 'email'
  | 'copy'
  | 'system';

export const BASE_URL = 'https://jaminproperties.co';

export function referralUrl(referralCode: string, propertyId?: string) {
  return propertyId
    ? `${BASE_URL}/p/${propertyId}?ref=${referralCode}`
    : `${BASE_URL}/r/${referralCode}`;
}

/** Share a rendered PNG (brochure/ad/card) through the OS sheet → every channel. */
export async function shareImageFile(uri: string, message?: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share',
      UTI: 'public.png',
    });
  } else {
    await Share.share({ url: uri, message });
  }
}

/** Share a text+link to a specific channel (deep links where supported). */
export async function shareToChannel(channel: Channel, text: string, url: string) {
  const full = `${text} ${url}`.trim();
  const enc = encodeURIComponent(full);
  try {
    switch (channel) {
      case 'whatsapp':
        return await Linking.openURL(`whatsapp://send?text=${enc}`);
      case 'telegram':
        return await Linking.openURL(
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        );
      case 'facebook':
        // Facebook's sharer only accepts a URL (no prefilled text, by FB policy).
        return await Linking.openURL(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        );
      case 'twitter':
        return await Linking.openURL(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        );
      case 'linkedin':
        return await Linking.openURL(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        );
      case 'sms':
        return await Linking.openURL(`sms:?body=${enc}`);
      case 'email':
        return await Linking.openURL(
          `mailto:?subject=${encodeURIComponent('JAMIN Properties')}&body=${enc}`,
        );
      case 'copy':
        await Clipboard.setStringAsync(full);
        return Alert.alert('Copied', 'Link copied to clipboard.');
      case 'system':
      default:
        return void (await Share.share({ message: full, url }));
    }
  } catch {
    await Share.share({ message: full, url });
  }
}

/** Record a shared artifact so downstream signups attribute to the sharer (§8/§9). */
export async function logArtifactShare(opts: {
  artifact: 'card' | 'brochure' | 'ad' | 'link';
  referralCode: string;
  channel: Channel | string;
}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase
    .from('referral_events')
    .insert({
      sharer_id: data.user.id,
      artifact_type: opts.artifact,
      token: opts.referralCode,
      channel: String(opts.channel),
      stage: 'shared',
    })
    .then(
      () => {},
      () => {},
    );
}
