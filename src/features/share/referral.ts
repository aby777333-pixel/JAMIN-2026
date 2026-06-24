import { Share } from 'react-native';

import { deviceInfo } from '@/features/referral/device';
import { supabase } from '@/lib/supabase';

const BASE = 'https://jaminproperties.co';

/**
 * Share with referral attribution (§5.05 property sharing / referral links, §8).
 * Logs a referral_events row (artifact_type=link) with a device fingerprint and an
 * optional campaign, then opens the native share sheet with a ref-tagged URL so
 * every downstream signup binds back to the sharer.
 */
export async function shareReferral(opts: {
  referralCode: string;
  propertyId?: string;
  propertyLabel?: string;
  channel?: string;
  campaignId?: string;
  campaignSlug?: string;
}) {
  let url = opts.propertyId
    ? `${BASE}/p/${opts.propertyId}?ref=${opts.referralCode}`
    : `${BASE}/r/${opts.referralCode}`;
  if (opts.campaignSlug) {
    url += url.includes('?') ? `&c=${opts.campaignSlug}` : `?c=${opts.campaignSlug}`;
  }

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const device = await deviceInfo().catch(() => ({}));
    await supabase
      .from('referral_events')
      .insert({
        sharer_id: data.user.id,
        artifact_type: 'link',
        token: opts.referralCode,
        channel: opts.channel ?? 'share',
        stage: 'shared',
        device,
        campaign_id: opts.campaignId ?? null,
      })
      .then(
        () => {},
        () => {},
      );
  }

  const message = opts.propertyLabel
    ? `Check out ${opts.propertyLabel} on JAMIN Properties — ${url}`
    : `Join me on JAMIN Properties — ${url}`;
  await Share.share({ message, url });
}
