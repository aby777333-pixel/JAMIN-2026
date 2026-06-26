import { router } from 'expo-router';
import { useRef } from 'react';
import { Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';

import { BG } from '@/components/brand/backgrounds';
import { ImageBackdrop } from '@/components/brand/ImageBackdrop';
import { ShareChannels } from '@/components/share/ShareChannels';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { logArtifactShare } from '@/features/marketing/share';
import { shareVCard } from '@/features/marketing/vcard';
import { useAuth } from '@/stores/auth';
import { BRAND, TAGLINE, color } from '@/theme/tokens';

/**
 * ★ Digital Business Card (SuperPrompt §6) — auto-filled from the profile, the
 * first-class entry point of the referral funnel. The referral QR/link carries
 * the user's code so every scan attributes back to them. vCard export and
 * per-channel sharing (P6) make it the full marketing artifact.
 */
export default function CardScreen() {
  const profile = useAuth((s) => s.profile);
  const cardRef = useRef<View>(null);

  const code = profile?.referral_code ?? 'JAMIN';
  const referralUrl = `https://jaminproperties.co/r/${code}`;

  async function onVCard() {
    await shareVCard({
      name: profile?.full_name ?? 'JAMIN Partner',
      phone: profile?.phone,
      email: profile?.email,
      url: referralUrl,
    });
  }

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
    <Screen contentClassName="pt-4 gap-5" backdrop={<ImageBackdrop source={BG.card} />}>
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

          <View className="mt-4 flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="font-bold text-[22px] text-white" numberOfLines={1}>
                {profile?.full_name ?? 'Member'}
              </Text>
              <Text className="mt-0.5 text-[13px] text-white/70" numberOfLines={1}>
                {profile?.designation ?? 'JAMIN Partner'}
              </Text>

              <View className="mt-4 gap-1">
                {profile?.phone ? (
                  <Text className="font-mono text-[13px] text-white/90" numberOfLines={1}>{profile.phone}</Text>
                ) : null}
                {profile?.email ? (
                  <Text className="text-[13px] text-white/90" numberOfLines={1}>{profile.email}</Text>
                ) : null}
              </View>
            </View>

            <View className="items-center rounded-2xl bg-white p-2">
              <QRCode value={referralUrl} size={92} color={color.charcoal} backgroundColor="#FFFFFF" />
              <Text className="mt-1 font-mono-bold text-[11px] text-ink">{code}</Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-center justify-between gap-2 border-t border-white/10 pt-3">
            <Text className="min-w-0 flex-1 font-medium text-[10px] uppercase tracking-[1.5px] text-gold" numberOfLines={1}>
              {TAGLINE}
            </Text>
            <Text className="text-[10px] text-white/50" numberOfLines={1}>jaminproperties.co</Text>
          </View>
        </View>
      </View>

      {!profile?.full_name || !profile?.phone ? (
        <Text variant="caption" className="text-center text-gold-deep">
          Add your name & phone so they appear on your card — tap “Edit my details”.
        </Text>
      ) : null}

      <View className="gap-3">
        <Button title="Share my card" onPress={onShare} />
        <Button title="Edit my details" variant="secondary" onPress={() => router.push('/profile')} />
        <Button title="Save contact (vCard)" variant="outline" onPress={onVCard} />
      </View>

      <View className="gap-2">
        <Text variant="label">Send your invite link</Text>
        <ShareChannels
          text="Join me on JAMIN Properties —"
          url={referralUrl}
          onShare={(ch) => logArtifactShare({ artifact: 'card', referralCode: code, channel: ch })}
        />
      </View>

      <Text variant="caption" className="text-center">
        Scanning the code opens the app (or the web invite) and binds the new signup to you.
      </Text>
    </Screen>
  );
}
