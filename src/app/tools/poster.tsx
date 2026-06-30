import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, ScrollView, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { AgentStamp } from '@/components/brand/AgentStamp';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { callAI } from '@/features/ai/api';
import { AD_FORMATS, type AdFormatKey } from '@/features/marketing/formats';
import { publishAd } from '@/features/marketing/ad';
import { logArtifactShare, shareImageFile } from '@/features/marketing/share';
import { formatINR, money } from '@/lib/money';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

interface Media {
  uri: string; // the background still (a video's extracted frame, or the photo)
  kind: 'image' | 'video';
  sourceUri?: string; // original video file (for in-page playback on the ad)
  videoMime?: string;
}

/**
 * Poster / Banner Maker — turn a photo OR a video (a frame is extracted) plus a
 * few details into a branded, shareable ad creative. Reuses the same compositing
 * (captureRef), branding (AgentStamp QR) and publish/share pipeline as the Ad
 * Creator, so output is consistent across the marketing suite.
 */
export default function PosterMaker() {
  const profile = useAuth((s) => s.profile);
  const frameRef = useRef<View>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const [format, setFormat] = useState<AdFormatKey>('flyer');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [highlights, setHighlights] = useState('');
  const [tagline, setTagline] = useState('');
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [picking, setPicking] = useState(false);

  const highlightList = useMemo(
    () =>
      highlights
        .split(/[\n,]/)
        .map((h) => h.trim())
        .filter(Boolean)
        .slice(0, 3),
    [highlights],
  );

  async function pick() {
    setPicking(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.9,
        mediaTypes: ['images', 'videos'],
        videoMaxDuration: 60,
      });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      if (a.type === 'video') {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(a.uri, { time: 1500, quality: 0.9 });
          setMedia({ uri, kind: 'video', sourceUri: a.uri, videoMime: a.mimeType ?? 'video/mp4' });
        } catch {
          Alert.alert('Could not read video', 'Try a different video or use a photo.');
        }
      } else {
        setMedia({ uri: a.uri, kind: 'image' });
      }
    } finally {
      setPicking(false);
    }
  }

  async function writeWithAI() {
    if (!title.trim() && !highlights.trim()) {
      Alert.alert('Add details first', 'Enter a title or a few highlights, then let AI craft the headline.');
      return;
    }
    setWriting(true);
    try {
      const res = await callAI('social', {
        context: `${title}. ${highlightList.join(', ')}`.trim(),
        location: location.trim() || undefined,
        price: price.trim() || undefined,
      });
      // Use the first punchy line as the tagline.
      const line = res.output.split('\n').map((s) => s.trim()).find(Boolean) ?? res.output;
      setTagline(line.replace(/^["“]|["”]$/g, '').slice(0, 120));
    } catch (e) {
      Alert.alert('AI', errMessage(e));
    } finally {
      setWriting(false);
    }
  }

  async function render(): Promise<string | null> {
    try {
      return await captureRef(frameRef, { format: 'png', quality: 1 });
    } catch (e) {
      Alert.alert('Render failed', errMessage(e));
      return null;
    }
  }

  async function onSave() {
    setBusy(true);
    try {
      const uri = await render();
      if (!uri) return;
      if (Platform.OS === 'web') {
        await shareImageFile(uri, title || 'JAMIN Properties');
        return;
      }
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (perm.granted) {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Saved', 'Poster saved to your gallery.');
      } else {
        await shareImageFile(uri, title || 'JAMIN Properties');
      }
    } catch (e) {
      Alert.alert('Could not save', errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!media) return;
    setBusy(true);
    try {
      const uri = await render();
      if (!uri) return;
      if (profile?.referral_code)
        await logArtifactShare({ artifact: 'ad', referralCode: profile.referral_code, channel: 'link' });

      if (Platform.OS !== 'web' && profile?.id) {
        try {
          const { url } = await publishAd({
            uri,
            ownerId: profile.id,
            place: location.trim() || undefined,
            agentName: profile.full_name,
            agentPhone: profile.phone,
            agentReferral: profile.referral_code,
            videoUri: media.kind === 'video' ? media.sourceUri : undefined,
            videoMime: media.videoMime,
          });
          const caption =
            `${title || 'Property for sale'}${price.trim() ? ` · ${formatINR(money(price))}` : ''}` +
            `${location.trim() ? ` · ${location.trim()}` : ''}\n` +
            'JAMIN Properties · Signature for Fortune\n' +
            url;
          await Share.share({ message: caption, url });
          return;
        } catch {
          /* fall through to image share */
        }
      }
      await shareImageFile(uri, title || 'JAMIN Properties');
    } finally {
      setBusy(false);
    }
  }

  // ── Pick step ──────────────────────────────────────────────────────────────
  if (!media) {
    return (
      <Screen contentClassName="pb-10 gap-4" keyboardAvoiding>
        <BackHeader title="Poster / Banner Maker" />
        <Card className="items-center gap-3 py-10">
          <Ionicons name="images" size={36} color={color.gold} />
          <Text variant="title" className="text-[15px]">Start with a photo or video</Text>
          <Text variant="caption" className="px-6 text-center">
            Pick a property photo or a video clip — we’ll pull a clean frame — then add details to build a
            share-ready poster.
          </Text>
          <View className="w-52">
            <Button title={picking ? 'Opening…' : 'Choose photo / video'} loading={picking} onPress={pick} />
          </View>
        </Card>
      </Screen>
    );
  }

  // ── Compose step ─────────────────────────────────────────────────────────────
  const fmt = AD_FORMATS.find((f) => f.key === format)!;
  const frameW = Dimensions.get('window').width - 40;
  const frameH = Math.min(frameW * (fmt.h / fmt.w), 640);

  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <BackHeader title="Your poster" />

        {/* Exported frame */}
        <View
          ref={frameRef}
          collapsable={false}
          className="mt-2 overflow-hidden rounded-2xl bg-charcoal"
          style={{ width: frameW, height: frameH, alignSelf: 'center' }}>
          <Image source={{ uri: media.uri }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />
          {/* legibility scrim */}
          <View style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.28)' }} />

          <View className="flex-1 justify-between">
            <View className="flex-row items-start justify-between p-3">
              <View className="rounded-lg bg-red px-2 py-1">
                <Text className="font-bold text-[10px] uppercase tracking-[1px] text-white">JAMIN Properties</Text>
              </View>
              {media.kind === 'video' ? (
                <View className="flex-row items-center gap-1 rounded-lg bg-black/55 px-2 py-1">
                  <Ionicons name="videocam" size={11} color={color.gold} />
                  <Text className="font-medium text-[10px] text-white">Video frame</Text>
                </View>
              ) : null}
            </View>

            <View className="bg-black/65 p-3">
              {title.trim() ? (
                <Text className="font-mono-bold text-[20px] leading-[24px] text-white" numberOfLines={2}>
                  {title.trim()}
                </Text>
              ) : null}
              <View className="mt-1 flex-row flex-wrap items-center gap-2">
                {price.trim() ? (
                  <View className="rounded-md bg-gold px-2 py-0.5">
                    <Text className="font-mono-bold text-[13px] text-ink">{formatINR(money(price))}</Text>
                  </View>
                ) : null}
                {location.trim() ? (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="location" size={12} color={color.gold} />
                    <Text className="text-[12px] text-white/90">{location.trim()}</Text>
                  </View>
                ) : null}
              </View>
              {tagline.trim() ? (
                <Text className="mt-1.5 text-[12px] italic text-white/85" numberOfLines={2}>{tagline.trim()}</Text>
              ) : null}
              {highlightList.length > 0 ? (
                <View className="mt-2 gap-0.5">
                  {highlightList.map((h) => (
                    <View key={h} className="flex-row items-center gap-1.5">
                      <Ionicons name="checkmark-circle" size={12} color={color.gold} />
                      <Text className="text-[11px] text-white/90" numberOfLines={1}>{h}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
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

        {/* Details */}
        <Card className="mt-4 gap-3">
          <Text variant="label">Details</Text>
          <Input label="Headline / title" placeholder="e.g. Premium 2BHK Villa" value={title} onChangeText={setTitle} />
          <View className="flex-row gap-3">
            <View className="flex-1"><Input label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" /></View>
            <View className="flex-1"><Input label="Location" value={location} onChangeText={setLocation} /></View>
          </View>
          <Input
            label="Highlights (comma or new line, up to 3)"
            placeholder="Gated community, near IT park, ready to move"
            value={highlights}
            onChangeText={setHighlights}
            multiline
          />
          <View className="flex-row items-center gap-2">
            <View className="flex-1"><Input label="Tagline" placeholder="Optional one-liner" value={tagline} onChangeText={setTagline} /></View>
            <Button title={writing ? '…' : '✨ AI'} variant="secondary" className="h-12 mt-5" loading={writing} onPress={writeWithAI} />
          </View>
        </Card>

        <Text variant="label" className="mb-2 mt-4">Format</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
          {AD_FORMATS.map((f) => (
            <Chip key={f.key} label={f.label} active={format === f.key} onPress={() => setFormat(f.key)} />
          ))}
        </ScrollView>

        <View className="mt-5 gap-3">
          <Button title="Share ad" loading={busy} onPress={onShare} />
          <View className="flex-row gap-3">
            <View className="flex-1"><Button title="Save to gallery" variant="outline" onPress={onSave} disabled={busy} /></View>
            <View className="flex-1"><Button title="Change media" variant="ghost" onPress={() => setMedia(null)} disabled={busy} /></View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
