import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { generateImage } from '@/features/ai/api';
import { shareImageFile } from '@/features/marketing/share';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

const ASPECTS = [
  { key: '4:3', label: 'Flyer 4:3' },
  { key: '1:1', label: 'Post 1:1' },
  { key: '16:9', label: 'Banner 16:9' },
  { key: '9:16', label: 'Story 9:16' },
];

const PRESETS = [
  'A luxurious modern villa at golden hour, lush garden, cinematic real-estate photo',
  'An aerial view of a premium gated plot layout with wide roads and greenery',
  'A festive Diwali property offer banner with diyas, marigold and warm golden light',
  'A serene open land plot at sunrise with mountains behind, calm and auspicious',
];

const RATIO: Record<string, number> = { '4:3': 3 / 4, '1:1': 1, '16:9': 9 / 16, '9:16': 16 / 9 };

export default function AiImage() {
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('4:3');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function onGenerate() {
    if (prompt.trim().length < 3) {
      Alert.alert('Add a prompt', 'Describe the image you want to create.');
      return;
    }
    setBusy(true);
    setNote(null);
    setUrl(null);
    try {
      const res = await generateImage(prompt.trim(), aspect);
      if (res.url) setUrl(res.url);
      else setNote(res.message ?? 'Could not generate an image.');
    } catch (e) {
      setNote(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  /** Download the generated (remote) image to a local file for saving/sharing. */
  async function toLocal(): Promise<string | null> {
    if (!url) return null;
    try {
      const dest = `${FileSystem.cacheDirectory}jamin_ai_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      return uri;
    } catch (e) {
      Alert.alert('Download failed', errMessage(e));
      return null;
    }
  }

  async function onSave() {
    setBusy(true);
    const local = await toLocal();
    if (local) {
      try {
        if (Platform.OS === 'web') {
          await shareImageFile(local, 'JAMIN Properties');
        } else {
          const perm = await MediaLibrary.requestPermissionsAsync();
          if (perm.granted) {
            await MediaLibrary.saveToLibraryAsync(local);
            Alert.alert('Saved', 'Image saved to your gallery.');
          } else {
            await shareImageFile(local, 'JAMIN Properties');
          }
        }
      } catch {
        await shareImageFile(local, 'JAMIN Properties');
      }
    }
    setBusy(false);
  }

  async function onShare() {
    setBusy(true);
    const local = await toLocal();
    if (local) await shareImageFile(local, 'Made with JAMIN Properties');
    setBusy(false);
  }

  async function onUseInFlyer() {
    setBusy(true);
    const local = await toLocal();
    setBusy(false);
    if (local) router.push({ pathname: '/tools/poster', params: { imageUri: local } });
  }

  const previewRatio = RATIO[aspect] ?? 3 / 4;

  return (
    <View className="flex-1 bg-paper">
      <ScrollView
        contentContainerClassName="px-5 gap-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <BackHeader title="AI Image Generator" />

        <Text variant="caption">
          Describe a scene and let AI create a stunning image for your flyers, banners and posts.
        </Text>

        <Card className="items-center gap-3">
          {url ? (
            <Image
              source={{ uri: url }}
              style={{ width: '100%', aspectRatio: 1 / previewRatio, borderRadius: 14 }}
              contentFit="cover"
            />
          ) : (
            <View
              className="w-full items-center justify-center rounded-2xl bg-paper"
              style={{ aspectRatio: 1 / previewRatio }}>
              {busy ? (
                <ActivityIndicator color={color.red} />
              ) : (
                <Ionicons name="sparkles" size={34} color={color.gold} />
              )}
            </View>
          )}
          {url ? (
            <View className="w-full gap-2">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button title="Save" variant="outline" disabled={busy} onPress={onSave} />
                </View>
                <View className="flex-1">
                  <Button title="Share" disabled={busy} onPress={onShare} />
                </View>
              </View>
              <Button
                title="Use in Flyer maker"
                variant="secondary"
                left={<Ionicons name="image" size={16} color={color.ink} />}
                disabled={busy}
                onPress={onUseInFlyer}
              />
            </View>
          ) : null}
        </Card>

        {note ? (
          <Card className="border-gold/40 bg-gold/5">
            <Text variant="caption">{note}</Text>
          </Card>
        ) : null}

        <Input
          label="Prompt"
          placeholder="e.g. a modern villa at sunset, cinematic real-estate photo"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          className="h-auto min-h-[88px] py-3"
        />

        <View className="gap-1.5">
          <Text variant="label">Quick ideas</Text>
          <View className="gap-2">
            {PRESETS.map((p) => (
              <Chip key={p} label={p.length > 42 ? `${p.slice(0, 42)}…` : p} onPress={() => setPrompt(p)} />
            ))}
          </View>
        </View>

        <View className="gap-1.5">
          <Text variant="label">Format</Text>
          <View className="flex-row flex-wrap gap-2">
            {ASPECTS.map((a) => (
              <Chip key={a.key} label={a.label} active={aspect === a.key} onPress={() => setAspect(a.key)} />
            ))}
          </View>
        </View>

        <Button title={busy ? 'Generating…' : '✨ Generate image'} loading={busy} onPress={onGenerate} />

        <Text variant="caption" className="text-center text-muted">
          AI-generated imagery — review before publishing.
        </Text>
      </ScrollView>
    </View>
  );
}
