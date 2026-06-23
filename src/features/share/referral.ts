import { Share } from 'react-native';

import { supabase } from '@/lib/supabase';

const BASE = 'https://jaminproperties.co';

/**
 * Share with referral attribution (§5.05 property sharing / referral links, §8).
 * Logs a referral_events row (artifact_type=link) and opens the native share sheet
 * with a ref-tagged URL so every downstream signup binds back to the sharer.
 */
export async function shareReferral(opts: {
  referralCode: string;
  propertyId?: string;
  propertyLabel?: string;
  channel?: string;
}) {
  const url = opts.propertyId
    ? `${BASE}/p/${opts.propertyId}?ref=${opts.referralCode}`
    : `${BASE}/r/${opts.referralCode}`;

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase
      .from('referral_events')
      .insert({
        sharer_id: data.user.id,
        artifact_type: 'link',
        token: opts.referralCode,
        channel: opts.channel ?? 'share',
        stage: 'shared',
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
