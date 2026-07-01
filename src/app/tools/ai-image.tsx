import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

// Modular creative elements — tap to add to the prompt and compose a scene.
const COMPONENTS: { group: string; items: string[] }[] = [
  { group: 'Nature', items: ['coconut trees', 'palm trees', 'mountains', 'a river', 'a lake', 'a waterfall', 'lush gardens', 'rice fields', 'sunset sky', 'golden hour light', 'soft clouds'] },
  { group: 'Wildlife', items: ['birds', 'butterflies', 'a peacock', 'elephants', 'deer', 'horses'] },
  { group: 'Property', items: ['a modern villa', 'an apartment tower', 'a farmhouse', 'a luxury bungalow', 'a resort', 'a temple', 'a commercial building'] },
  { group: 'Real estate', items: ['residential plots', 'a gated community', 'wide layout roads', 'a compound wall', 'a grand entrance gate', 'a swimming pool', 'agricultural land', 'a plantation', 'solar panels'] },
  { group: 'Lifestyle', items: ['a luxury car', 'a fountain', 'street lights', 'a walking path', "a children's play area", 'a gazebo'] },
];

const RATIO: Record<string, number> = { '4:3': 3 / 4, '1:1': 1, '16:9': 9 / 16, '9:16': 16 / 9 };

export default function AiImage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('4:3');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function onGenerate() {
    if (prompt.trim().length < 3) {
      Alert.alert(t('tools.aiImage.addPrompt'), t('tools.aiImage.addPromptBody'));
      return;
    }
    setBusy(true);
    setNote(null);
    setUrl(null);
    try {
      const res = await generateImage(prompt.trim(), aspect);
      if (res.url) setUrl(res.url);
      else setNote(res.message ?? t('tools.aiImage.couldNotGen'));
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
      Alert.alert(t('tools.aiImage.downloadFailed'), errMessage(e));
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
            Alert.alert(t('tools.aiImage.saved'), t('tools.aiImage.savedBody'));
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

  function addElement(term: string) {
    setPrompt((p) => (p.trim() ? `${p.replace(/\s+$/, '')}, ${term}` : term));
  }

  const previewRatio = RATIO[aspect] ?? 3 / 4;

  return (
    <View className="flex-1 bg-paper">
      <ScrollView
        contentContainerClassName="px-5 gap-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <BackHeader title={t('tools.aiImage.title')} />

        <Text variant="caption">{t('tools.aiImage.intro')}</Text>

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
                  <Button title={t('tools.aiImage.save')} variant="outline" disabled={busy} onPress={onSave} />
                </View>
                <View className="flex-1">
                  <Button title={t('tools.aiImage.share')} disabled={busy} onPress={onShare} />
                </View>
              </View>
              <Button
                title={t('tools.aiImage.useInFlyer')}
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
          label={t('tools.aiImage.promptLabel')}
          placeholder={t('tools.aiImage.promptPh')}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          className="h-auto min-h-[88px] py-3"
        />

        <View className="gap-1.5">
          <Text variant="label">{t('tools.aiImage.quickIdeas')}</Text>
          <View className="gap-2">
            {PRESETS.map((p) => (
              <Chip key={p} label={p.length > 42 ? `${p.slice(0, 42)}…` : p} onPress={() => setPrompt(p)} />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text variant="label">{t('tools.aiImage.addElements')}</Text>
          {COMPONENTS.map((g) => (
            <View key={g.group} className="gap-1">
              <Text variant="caption">{g.group}</Text>
              <View className="flex-row flex-wrap gap-2">
                {g.items.map((it) => (
                  <Chip key={it} label={it} onPress={() => addElement(it)} />
                ))}
              </View>
            </View>
          ))}
        </View>

        <View className="gap-1.5">
          <Text variant="label">{t('tools.aiImage.format')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {ASPECTS.map((a) => (
              <Chip key={a.key} label={a.label} active={aspect === a.key} onPress={() => setAspect(a.key)} />
            ))}
          </View>
        </View>

        <Button title={busy ? t('tools.aiImage.generating') : t('tools.aiImage.generate')} loading={busy} onPress={onGenerate} />

        <Text variant="caption" className="text-center text-muted">
          {t('tools.aiImage.disclaimer')}
        </Text>
      </ScrollView>
    </View>
  );
}
