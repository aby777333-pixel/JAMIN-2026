import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { AgentStamp } from '@/components/brand/AgentStamp';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { AD_FORMATS, type AdFormatKey } from '@/features/marketing/formats';
import { logArtifactShare, shareImageFile } from '@/features/marketing/share';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

interface Capture {
  uri: string;
  lat?: number;
  lng?: number;
  place?: string;
  at: Date;
}

export default function AdCreator() {
  const profile = useAuth((s) => s.profile);
  const [perm, requestPerm] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const frameRef = useRef<View>(null);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [format, setFormat] = useState<AdFormatKey>('post');
  const [busy, setBusy] = useState(false);

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
      Alert.alert('Render failed', e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async function onSave() {
    setBusy(true);
    const uri = await persist();
    if (uri) {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Saved', 'Ad saved to your gallery.');
        }
      } catch {
        Alert.alert('Could not save', 'Gallery permission denied.');
      }
    }
    setBusy(false);
  }

  async function onShare() {
    setBusy(true);
    const uri = await persist();
    if (uri) {
      if (profile?.referral_code)
        await logArtifactShare({ artifact: 'ad', referralCode: profile.referral_code, channel: 'image' });
      await shareImageFile(uri, 'Live from site — JAMIN Properties');
    }
    setBusy(false);
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
        <BackHeader title="Photo Ad Creator" />
        <View className="mt-2 flex-1 overflow-hidden rounded-3xl bg-charcoal">
          {perm.granted ? (
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          ) : (
            <View className="flex-1 items-center justify-center gap-3 p-6">
              <Ionicons name="camera" size={36} color={color.gold} />
              <Text className="text-center text-white/80">
                Camera access lets you capture a live, geo-verified property photo.
              </Text>
              <Button title="Enable camera" variant="secondary" onPress={requestPerm} />
            </View>
          )}
        </View>
        <View className="mt-3 flex-row gap-3">
          <View className="flex-1">
            <Button title="Upload" variant="outline" onPress={pickPhoto} />
          </View>
          <View className="flex-[2]">
            <Button title="Capture live" onPress={takePhoto} disabled={!perm.granted} />
          </View>
        </View>
        <Text variant="caption" className="mt-2 text-center">
          We stamp the ad with the time, location and your branding — proof it was taken on site.
        </Text>
      </Screen>
    );
  }

  // ── Compose step ──────────────────────────────────────────────────────────
  const fmt = AD_FORMATS.find((f) => f.key === format)!;
  const frameW = Dimensions.get('window').width - 40;
  const frameH = Math.min(frameW * (fmt.h / fmt.w), 620);

  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="px-5 pb-8" showsVerticalScrollIndicator={false}>
        <BackHeader title="Your ad" />

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

        <Text variant="label" className="mb-2 mt-4">
          Format
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
          {AD_FORMATS.map((f) => (
            <Chip key={f.key} label={f.label} active={format === f.key} onPress={() => setFormat(f.key)} />
          ))}
        </ScrollView>

        <View className="mt-5 gap-3">
          <Button title="Share ad" loading={busy} onPress={onShare} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button title="Save to gallery" variant="outline" onPress={onSave} disabled={busy} />
            </View>
            <View className="flex-1">
              <Button title="Retake" variant="ghost" onPress={() => setCapture(null)} disabled={busy} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
