import { useRef } from 'react';
import { Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/stores/auth';
import { BRAND, TAGLINE, color } from '@/theme/tokens';

/**
 * ★ Digital Business Card (SuperPrompt §6) — auto-filled from the profile, the
 * first-class entry point of the referral funnel. The referral QR/link carries
 * the user's code so every scan attributes back to them. Full template engine,
 * vCard export and per-channel tracking land in P6; this is the live P1 card.
 */
export default function CardScreen() {
  const profile = useAuth((s) => s.profile);
  const cardRef = useRef<View>(null);

  const code = profile?.referral_code ?? 'JAMIN';
  const referralUrl = `https://jaminproperties.co/r/${code}`;

  async function onShare() {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await Share.share({
        url: uri,
        message: `${profile?.full_name ?? 'A JAMIN partner'} invites you to JAMIN Properties — ${referralUrl}`,
      });
    } catch {
      await Share.share({
        message: `${profile?.full_name ?? 'A JAMIN partner'} invites you to JAMIN Properties — ${referralUrl}`,
      });
    }
  }

  return (
    <Screen contentClassName="pt-4 gap-5">
      <Text variant="h1">Your Card</Text>

      {/* Captured region = the shareable card */}
      <View
        ref={cardRef}
        collapsable={false}
        className="overflow-hidden rounded-3xl border border-line"
        style={{ backgroundColor: color.charcoal }}>
        <View className="h-2 bg-red" />
        <View className="p-5">
          <Text className="font-medium text-[11px] uppercase tracking-[3px] text-gold">{BRAND}</Text>

          <View className="mt-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="font-bold text-[22px] text-white">
                {profile?.full_name ?? 'Member'}
              </Text>
              <Text className="mt-0.5 text-[13px] text-white/70">
                {profile?.designation ?? 'JAMIN Partner'}
              </Text>

              <View className="mt-4 gap-1">
                {profile?.phone ? (
                  <Text className="font-mono text-[13px] text-white/90">{profile.phone}</Text>
                ) : null}
                {profile?.email ? (
                  <Text className="text-[13px] text-white/90">{profile.email}</Text>
                ) : null}
              </View>
            </View>

            <View className="items-center rounded-2xl bg-white p-2">
              <QRCode value={referralUrl} size={96} color={color.charcoal} backgroundColor="#FFFFFF" />
              <Text className="mt-1 font-mono-bold text-[11px] text-ink">{code}</Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-center justify-between border-t border-white/10 pt-3">
            <Text className="font-medium text-[10px] uppercase tracking-[2px] text-gold">
              {TAGLINE}
            </Text>
            <Text className="text-[10px] text-white/50">jaminproperties.co</Text>
          </View>
        </View>
      </View>

      <Button title="Share my card" onPress={onShare} />
      <Text variant="caption" className="text-center">
        Scanning the code opens the app (or the web invite) and binds the new signup to you.
      </Text>
    </Screen>
  );
}
