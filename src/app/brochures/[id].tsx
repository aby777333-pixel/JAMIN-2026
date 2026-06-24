import { useLocalSearchParams } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { AgentStamp } from '@/components/brand/AgentStamp';
import { ShareChannels } from '@/components/share/ShareChannels';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { logBrochure, useBrochureTemplate } from '@/features/marketing/brochures';
import { logArtifactShare, referralUrl, shareImageFile } from '@/features/marketing/share';
import { useAuth } from '@/stores/auth';
import { BRAND, color } from '@/theme/tokens';

export default function BrochurePreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tpl, isLoading } = useBrochureTemplate(id);
  const profile = useAuth((s) => s.profile);
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <Screen scroll={false} contentClassName="justify-center">
        <ActivityIndicator color={color.red} />
      </Screen>
    );
  }
  if (!tpl) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Brochure" />
        <Text variant="body" className="mt-8 text-center text-muted">
          Brochure not found.
        </Text>
      </Screen>
    );
  }

  const accent = tpl.config.accent ?? color.red;
  const code = profile?.referral_code ?? 'JAMIN';
  const url = referralUrl(code);
  const w = Dimensions.get('window').width - 40;
  const h = w * (4 / 3);

  async function render(): Promise<string | null> {
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1 });
      await logBrochure({ templateId: tpl!.id });
      return uri;
    } catch (e) {
      Alert.alert('Render failed', e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async function onShareImage() {
    setBusy(true);
    const uri = await render();
    if (uri) {
      await logArtifactShare({ artifact: 'brochure', referralCode: code, channel: 'image' });
      await shareImageFile(uri, `${tpl!.config.headline ?? 'JAMIN Properties'} — ${url}`);
    }
    setBusy(false);
  }

  async function onSave() {
    setBusy(true);
    const uri = await render();
    if (uri) {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Saved', 'Brochure saved to your gallery.');
        }
      } catch {
        Alert.alert('Could not save', 'Gallery permission denied.');
      }
    }
    setBusy(false);
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title={tpl.name} />

      {/* Captured poster */}
      <View
        ref={ref}
        collapsable={false}
        className="overflow-hidden rounded-2xl bg-surface border border-line"
        style={{ width: w, height: h, alignSelf: 'center' }}>
        <View style={{ height: 10, backgroundColor: accent }} />
        <View className="flex-1 p-5 justify-between">
          <View>
            <Text className="font-medium text-[11px] uppercase tracking-[3px]" style={{ color: accent }}>
              {BRAND}
            </Text>
            <Text className="mt-6 font-black text-[30px] leading-[34px] text-ink">
              {tpl.config.headline ?? 'Own a piece of fortune'}
            </Text>
            {tpl.config.subhead ? (
              <Text className="mt-2 text-[15px] text-muted">{tpl.config.subhead}</Text>
            ) : null}
            {tpl.config.body ? (
              <Text className="mt-4 text-[13px] text-ink">{tpl.config.body}</Text>
            ) : (
              <Text className="mt-4 text-[13px] text-ink">
                Premium plots, villas, apartments & commercial spaces. Dynamic inventory, transparent
                pricing, expert guidance.
              </Text>
            )}
            {tpl.config.cta ? (
              <View className="mt-5 self-start rounded-full px-4 py-2" style={{ backgroundColor: accent }}>
                <Text className="font-semibold text-[13px] text-white">{tpl.config.cta}</Text>
              </View>
            ) : null}
          </View>

          <View className="rounded-2xl bg-charcoal p-3">
            <AgentStamp
              name={profile?.full_name ?? 'JAMIN Partner'}
              phone={profile?.phone}
              referralCode={code}
              photoUrl={profile?.photo_url}
              qrSize={58}
            />
          </View>
        </View>
      </View>

      <View className="gap-3">
        <Button title="Share brochure" loading={busy} onPress={onShareImage} />
        <Button title="Save to gallery" variant="outline" disabled={busy} onPress={onSave} />
      </View>

      <View className="gap-2">
        <Text variant="label">Share your link to a channel</Text>
        <ShareChannels
          text={`${tpl.config.headline ?? 'Discover JAMIN Properties'} —`}
          url={url}
          onShare={(ch) => logArtifactShare({ artifact: 'brochure', referralCode: code, channel: ch })}
        />
      </View>
    </Screen>
  );
}
