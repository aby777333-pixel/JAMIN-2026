import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Linking, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { captureRef } from 'react-native-view-shot';

import { AgentStamp } from '@/components/brand/AgentStamp';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { enhancePhoto } from '@/features/ai/api';
import { AD_FORMATS, type AdFormatKey } from '@/features/marketing/formats';
import { publishAd } from '@/features/marketing/ad';
import { logArtifactShare, shareImageFile } from '@/features/marketing/share';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

interface Capture {
  uri: string;
  lat?: number;
  lng?: number;
  place?: string;
  at: Date;
}

export default function AdCreator() {
  const profile = useAuth((s) => s.profile);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const frameRef = useRef<View>(null);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [format, setFormat] = useState<AdFormatKey>('post');
  const [busy, setBusy] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanced, setEnhanced] = useState(false);

  async function onEnhance() {
    if (!capture) return;
    setEnhancing(true);
    try {
      const m = await ImageManipulator.manipulateAsync(capture.uri, [{ resize: { width: 1280 } }], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      if (!m.base64) throw new Error('Could not read the image.');
      const res = await enhancePhoto(m.base64, 'image/jpeg');
      if (res.configured === false) {
        Alert.alert('AI Enhance', res.message ?? 'Not enabled yet.');
        return;
      }
      if (res.url) {
        setCapture({ ...capture, uri: res.url });
        setEnhanced(true);
        Alert.alert('Enhanced ✨', 'Your photo has been sharpened and upscaled by AI.');
      }
    } catch (e) {
      Alert.alert('Enhance failed', errMessage(e));
    } finally {
      setEnhancing(false);
    }
  }

  async function withLocation(uri: string) {
    let lat: number | undefined;
    let lng: number | undefined;
    let place: string | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const g = geo[0];
        place = [g?.district ?? g?.subregion, g?.city ?? g?.region].filter(Boolean).join(', ');
      }
    } catch {
      // location optional — ad still generates without it
    }
    setEnhanced(false);
    setCapture({ uri, lat, lng, place, at: new Date() });
  }

  async function takePhoto() {
    const shot = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
    if (shot?.uri) await withLocation(shot.uri);
  }

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ['images'] });
    if (!res.canceled && res.assets[0]?.uri) await withLocation(res.assets[0].uri);
  }

  async function persist(): Promise<string | null> {
    try {
      const uri = await captureRef(frameRef, { format: 'png', quality: 1 });
      // best-effort analytics record
      await supabase
        .from('ad_creatives')
        .insert({
          user_id: profile?.id as string,
          format,
          geo: capture ? { lat: capture.lat, lng: capture.lng } : null,
          place: capture?.place ?? null,
          captured_at: capture?.at.toISOString() ?? null,
        })
        .then(
          () => {},
          () => {},
        );
      return uri;
    } catch (e) {
      Alert.alert('Render failed', errMessage(e));
      return null;
    }
  }

  async function onSave() {
    setBusy(true);
    const uri = await persist();
    if (uri) {
      // Web has no media library; fall back to the share/download sheet so the user can still save.
      if (Platform.OS === 'web') {
        await shareImageFile(uri, 'Live from site — JAMIN Properties');
      } else {
        try {
          const perm = await MediaLibrary.requestPermissionsAsync();
          if (perm.granted) {
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert('Saved', 'Ad saved to your gallery.');
          } else {
            // Permission denied — share instead so saving is never a dead end.
            await shareImageFile(uri, 'Live from site — JAMIN Properties');
          }
        } catch {
          await shareImageFile(uri, 'Live from site — JAMIN Properties');
        }
      }
    }
    setBusy(false);
  }

  async function onShare() {
    setBusy(true);
    try {
      const uri = await persist();
      if (!uri) return;
      if (profile?.referral_code)
        await logArtifactShare({ artifact: 'ad', referralCode: profile.referral_code, channel: 'link' });

      // Publish a rich, interactive ad page and share its LINK, so the recipient
      // gets the full experience (photo + maps + tap-to-call + live chat + sender
      // card + QR). Falls back to sharing the image on web or any publish error.
      if (Platform.OS !== 'web' && profile?.id) {
        try {
          const { url } = await publishAd({
            uri,
            ownerId: profile.id,
            place: capture?.place,
            lat: capture?.lat,
            lng: capture?.lng,
            agentName: profile.full_name,
            agentPhone: profile.phone,
            agentReferral: profile.referral_code,
            capturedAt: capture?.at.toISOString(),
          });
          const caption =
            `🏡 Real property — captured live${capture?.place ? ` · ${capture.place}` : ''}\n` +
            'JAMIN Properties · Signature for Fortune\n' +
            'View photo, location & contact 👇\n' +
            url;
          // Share the LINK to the interactive ad page (the link preview shows the
          // real flyer via the /ad og:image function). Receiver gets a tappable link.
          await Share.share({ message: caption, url });
          return;
        } catch {
          // fall through to image share on any publish/upload failure
        }
      }
      await shareImageFile(uri, 'Live from site — JAMIN Properties');
    } finally {
      setBusy(false);
    }
  }

  async function openExternal(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open', 'No app available to open this link.');
    }
  }

  async function copyCoords() {
    if (capture?.lat == null || capture?.lng == null) return;
    await Clipboard.setStringAsync(`${capture.lat.toFixed(6)}, ${capture.lng.toFixed(6)}`);
    Alert.alert(t('tools.adCreator.copied'), t('tools.adCreator.coordsCopied'));
  }

  // ── Camera step ───────────────────────────────────────────────────────────
  if (!capture) {
    if (!perm) {
      return (
        <Screen scroll={false} contentClassName="justify-center">
          <ActivityIndicator color={color.red} />
        </Screen>
      );
    }
    return (
      <Screen scroll={false} contentClassName="pt-2">
        <BackHeader title={t('tools.adCreator.title')} />
        <View className="mt-2 flex-1 overflow-hidden rounded-3xl bg-charcoal">
          {perm.granted ? (
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          ) : (
            <View className="flex-1 items-center justify-center gap-3 p-6">
              <Ionicons name="camera" size={36} color={color.gold} />
              <Text className="text-center text-white/80">{t('tools.adCreator.camAccess')}</Text>
              <Button title={t('tools.adCreator.enableCam')} variant="secondary" onPress={requestPerm} />
            </View>
          )}
        </View>
        <View className="mt-3 flex-row gap-3">
          <View className="flex-1">
            <Button title={t('tools.adCreator.upload')} variant="outline" onPress={pickPhoto} />
          </View>
          <View className="flex-[2]">
            <Button title={t('tools.adCreator.captureLive')} onPress={takePhoto} disabled={!perm.granted} />
          </View>
        </View>
        <Text variant="caption" className="mt-2 text-center">{t('tools.adCreator.stampNote')}</Text>
      </Screen>
    );
  }

  // ── Compose step ──────────────────────────────────────────────────────────
  const fmt = AD_FORMATS.find((f) => f.key === format)!;
  const frameW = Dimensions.get('window').width - 40;
  const frameH = Math.min(frameW * (fmt.h / fmt.w), 620);

  return (
    <View className="flex-1 bg-paper">
      <ScrollView
        contentContainerClassName="px-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}>
        <BackHeader title={t('tools.adCreator.yourAd')} />

        <View
          ref={frameRef}
          collapsable={false}
          className="mt-2 overflow-hidden rounded-2xl"
          style={{ width: frameW, height: frameH, alignSelf: 'center' }}>
          <Image source={{ uri: capture.uri }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />

          <View className="flex-1 justify-between">
            <View className="flex-row items-start justify-between p-3">
              <View className="rounded-lg bg-red px-2 py-1">
                <Text className="font-bold text-[10px] uppercase tracking-[1px] text-white">JAMIN Properties</Text>
              </View>
              <View className="flex-row items-center gap-1 rounded-lg bg-black/55 px-2 py-1">
                <Ionicons name="location" size={11} color={color.gold} />
                <Text className="font-medium text-[10px] text-white">Taken on site</Text>
              </View>
            </View>

            <View className="bg-black/65 p-3">
              <View className="mb-2 flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-red" />
                <Text className="font-semibold text-[11px] uppercase tracking-[1px] text-white">
                  Real property · Captured live
                </Text>
              </View>
              <Text className="text-[11px] text-white/80">
                {capture.at.toLocaleDateString('en-IN')} ·{' '}
                {capture.at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                {capture.place ? ` · ${capture.place}` : ''}
              </Text>
              <View className="mt-3">
                <AgentStamp
                  name={profile?.full_name ?? 'JAMIN Partner'}
                  phone={profile?.phone}
                  referralCode={profile?.referral_code ?? 'JAMIN'}
                  qrSize={54}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Location & contact — interactive, lives OUTSIDE frameRef so the exported ad is unchanged */}
        <Card className="mt-4 gap-3">
          <Text variant="label">{t('tools.adCreator.locationContact')}</Text>

          {capture.lat != null && capture.lng != null ? (
            <>
              <Pressable
                onPress={copyCoords}
                className="flex-row items-center justify-between rounded-xl border border-line bg-paper px-3 py-2.5">
                <View className="flex-1 flex-row items-center gap-2">
                  <Ionicons name="location" size={16} color={color.red} />
                  <View className="flex-1">
                    <Text className="font-mono text-[13px] text-ink">
                      {capture.lat.toFixed(6)}, {capture.lng.toFixed(6)}
                    </Text>
                    {capture.place ? <Text variant="caption">{capture.place}</Text> : null}
                  </View>
                </View>
                <Ionicons name="copy-outline" size={16} color={color.muted} />
              </Pressable>

              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() =>
                    openExternal(
                      `https://earth.google.com/web/@${capture.lat},${capture.lng},100a,1000d,30y,0h,0t,0r`,
                    )
                  }
                  className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
                  <Ionicons name="earth" size={16} color={color.red} />
                  <Text className="text-[13px] font-semibold text-ink">{t('tools.adCreator.earthView')}</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    openExternal(
                      `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${capture.lat},${capture.lng}`,
                    )
                  }
                  className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
                  <Ionicons name="walk" size={16} color={color.red} />
                  <Text className="text-[13px] font-semibold text-ink">{t('tools.adCreator.streetView')}</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    openExternal(`https://www.google.com/maps/search/?api=1&query=${capture.lat},${capture.lng}`)
                  }
                  className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
                  <Ionicons name="map" size={16} color={color.red} />
                  <Text className="text-[13px] font-semibold text-ink">{t('tools.adCreator.openMaps')}</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    openExternal(`https://www.google.com/maps/dir/?api=1&destination=${capture.lat},${capture.lng}`)
                  }
                  className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
                  <Ionicons name="navigate" size={16} color={color.red} />
                  <Text className="text-[13px] font-semibold text-ink">{t('tools.adCreator.directions')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text variant="caption">{t('tools.adCreator.noLocation')}</Text>
          )}

          {profile?.phone ? (
            <Pressable
              onPress={() => openExternal(`tel:${profile.phone}`)}
              className="flex-row items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2.5">
              <Ionicons name="call" size={16} color={color.red} />
              <Text className="font-mono text-[14px] text-red">{profile.phone}</Text>
              <Text variant="caption" className="ml-auto">
                {t('tools.adCreator.tapToCall')}
              </Text>
            </Pressable>
          ) : null}
        </Card>

        <Text variant="label" className="mb-2 mt-4">
          {t('tools.adCreator.format')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
          {AD_FORMATS.map((f) => (
            <Chip key={f.key} label={f.label} active={format === f.key} onPress={() => setFormat(f.key)} />
          ))}
        </ScrollView>

        <View className="mt-5 gap-3">
          <Button
            title={enhancing ? t('tools.adCreator.enhancing') : enhanced ? t('tools.adCreator.enhanceAgain') : t('tools.adCreator.enhance')}
            variant="secondary"
            loading={enhancing}
            disabled={busy}
            onPress={onEnhance}
          />
          <Button title={t('tools.adCreator.shareAd')} loading={busy} onPress={onShare} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button title={t('tools.adCreator.saveGallery')} variant="outline" onPress={onSave} disabled={busy} />
            </View>
            <View className="flex-1">
              <Button
                title={t('tools.adCreator.retake')}
                variant="ghost"
                onPress={() => {
                  setEnhanced(false);
                  setCapture(null);
                }}
                disabled={busy}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
