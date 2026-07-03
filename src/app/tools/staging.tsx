import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { virtualStage } from '@/features/ai/api';
import { shareImageFile } from '@/features/marketing/share';
import { accentFor, color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** Section label with a dot in the section's accent colour. */
function GroupLabel({ tone, children, caption }: { tone: number; children: string; caption?: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: accentFor(tone).main }} />
      <Text variant={caption ? 'caption' : 'label'}>{children}</Text>
    </View>
  );
}

/** Palette slots per picker — greenery lands on green, water on blue, etc. */
const TONE = { type: 0, goal: 5, style: 6 } as const;
const elementTone = (gi: number) => gi + 3;

/** Property types — staging is NOT room-only; it works for every kind of real estate. */
const TYPES = [
  { key: 'plot', label: 'Empty plot', goal: 'develop' },
  { key: 'villa', label: 'Villa', goal: 'beautify' },
  { key: 'house', label: 'House', goal: 'beautify' },
  { key: 'apartment', label: 'Apartment', goal: 'beautify' },
  { key: 'farmhouse', label: 'Farmhouse', goal: 'landscape' },
  { key: 'farmland', label: 'Farmland', goal: 'develop' },
  { key: 'estate', label: 'Estate', goal: 'landscape' },
  { key: 'gated', label: 'Gated community', goal: 'develop' },
  { key: 'commercial', label: 'Commercial land', goal: 'develop' },
  { key: 'room', label: 'Interior room', goal: 'furnish' },
] as const;

/** What the user wants the AI to do to the property. */
const GOALS: { key: string; label: string; phrase: string }[] = [
  { key: 'develop', label: 'Develop & build', phrase: 'show it fully developed and built-up with tasteful architecture' },
  { key: 'beautify', label: 'Beautify', phrase: 'beautify and upgrade the surroundings' },
  { key: 'landscape', label: 'Landscape', phrase: 'add professional landscaping and greenery' },
  { key: 'furnish', label: 'Furnish', phrase: 'furnish the interior tastefully' },
  { key: 'exterior', label: 'Decorate exterior', phrase: 'add exterior decoration, finishing and facade styling' },
  { key: 'enhance', label: 'Clean & enhance', phrase: 'clean up, brighten and enhance the scene' },
];

const STYLES = ['Modern', 'Minimalist', 'Scandinavian', 'Luxury', 'Traditional Indian', 'Tropical', 'Rural', 'Urban'];

/** Realistic props the user can add into the actual photo — tap to compose. */
const ELEMENTS: { group: string; items: string[] }[] = [
  { group: 'Greenery', items: ['coconut trees', 'palm trees', 'lush gardens', 'flowering plants', 'hedges', 'a green lawn', 'potted plants'] },
  { group: 'Structures', items: ['a modern villa', 'a house', 'a cottage', 'a compound wall', 'a fence', 'a grand entrance gate', 'a gazebo', 'a car porch'] },
  { group: 'Water', items: ['a swimming pool', 'a pond', 'a lake', 'a fountain', 'a water feature'] },
  { group: 'Roads & access', items: ['a paved driveway', 'walking pathways', 'internal roads', 'street lights', 'a parking area'] },
  { group: 'Ambience', items: ['warm exterior lighting', 'a sunset sky', 'soft clouds', 'birds', 'a clear blue sky', 'golden-hour glow'] },
  { group: 'Life', items: ['parked cars', 'people walking', 'outdoor furniture', 'a seating area'] },
  { group: 'Interior', items: ['a sofa set', 'a dining table', 'a bed', 'a wardrobe', 'rugs & curtains', 'indoor plants', 'wall art'] },
];

/**
 * AI Property Studio — turn a REAL photo of any property (empty plot, villa,
 * apartment, house, farmhouse, farmland, estate, gated community, commercial
 * land or an interior room) into a beautiful, developed vision. Pick the property,
 * a goal and style, tap to add realistic elements, and the AI renders it
 * photorealistically — then share it with your digital card. Activates once a
 * Replicate token is set server-side (inert + friendly until then).
 */
export default function PropertyStudio() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [uri, setUri] = useState<string | null>(null);
  const [type, setType] = useState<(typeof TYPES)[number]['key']>('plot');
  const [goal, setGoal] = useState('develop');
  const [style, setStyle] = useState('Modern');
  const [elements, setElements] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const typeLabel = useMemo(() => TYPES.find((x) => x.key === type)?.label ?? 'property', [type]);

  function selectType(key: (typeof TYPES)[number]['key']) {
    setType(key);
    // Default the goal to the one that best fits this property type.
    const def = TYPES.find((x) => x.key === key)?.goal;
    if (def) setGoal(def);
  }

  function toggleElement(term: string) {
    setElements((prev) => (prev.includes(term) ? prev.filter((x) => x !== term) : [...prev, term]));
  }

  async function fromGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled && res.assets[0]) {
      setUri(res.assets[0].uri);
      setResult(null);
      setNote(null);
    }
  }

  async function fromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('tools.studio.camNeeded'), t('tools.studio.camNeededBody'));
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled && res.assets[0]) {
      setUri(res.assets[0].uri);
      setResult(null);
      setNote(null);
    }
  }

  function buildPrompt(): string {
    const phrase = GOALS.find((g) => g.key === goal)?.phrase ?? 'beautify the property';
    const add = elements.length ? ` Add ${elements.join(', ')}.` : '';
    const room = type === 'room';
    const keep = room
      ? 'Keep the room layout and windows.'
      : 'Keep the original camera angle, perspective and any existing structures.';
    return (
      `Edit this real photograph of a ${typeLabel.toLowerCase()}: ${phrase}.${add} ` +
      `${style} style. Photorealistic, ${keep} Natural daylight, crisp detail, ` +
      'clean high-end real-estate marketing quality.'
    );
  }

  async function transform() {
    if (!uri) return;
    setBusy(true);
    setNote(null);
    setResult(null);
    try {
      const m = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      if (!m.base64) throw new Error('Could not read the image.');
      const res = await virtualStage(m.base64, buildPrompt());
      if (res.url) {
        setResult(res.url);
        setNote(null);
      } else {
        setNote(res.message ?? (res.pending ? t('tools.studio.stillRendering') : t('tools.studio.couldNot')));
      }
    } catch (e) {
      setNote(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  /** Download the generated remote image to a local file for saving/sharing. */
  async function toLocal(): Promise<string | null> {
    if (!result) return null;
    try {
      const dest = `${FileSystem.cacheDirectory}jamin_studio_${Date.now()}.jpg`;
      const { uri: out } = await FileSystem.downloadAsync(result, dest);
      return out;
    } catch (e) {
      Alert.alert(t('tools.studio.downloadFailed'), errMessage(e));
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
            Alert.alert(t('tools.studio.saved'), t('tools.studio.savedBody'));
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
    if (local) await shareImageFile(local, 'Reimagined with JAMIN Properties');
    setBusy(false);
  }

  async function onUseInPoster() {
    setBusy(true);
    const local = await toLocal();
    setBusy(false);
    if (local) router.push({ pathname: '/tools/poster', params: { imageUri: local } });
  }

  const preview = result ?? uri;

  return (
    <View className="flex-1 bg-paper">
      <ScrollView
        contentContainerClassName="px-5 gap-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}>
        <BackHeader title={t('tools.staging.title')} />
        <Text variant="caption">{t('tools.staging.intro')}</Text>

        {/* Preview + capture */}
        <Card className="items-center gap-3">
          {preview ? (
            <Image source={{ uri: preview }} style={{ width: '100%', height: 220, borderRadius: 14 }} contentFit="cover" />
          ) : (
            <View className="h-52 w-full items-center justify-center rounded-2xl bg-paper">
              {busy ? <ActivityIndicator color={color.red} /> : <Ionicons name="color-wand" size={32} color={color.gold} />}
            </View>
          )}
          {result ? (
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-gold/20 px-2.5 py-1">
              <Ionicons name="sparkles" size={12} color={color.goldDeep} />
              <Text className="text-[11px] font-semibold text-ink">{t('tools.studio.aiResult')}</Text>
            </View>
          ) : null}
          <View className="w-full flex-row gap-3">
            <View className="flex-1">
              <Button
                title={t('tools.studio.takePhoto')}
                variant="outline"
                left={<Ionicons name="camera" size={16} color={color.ink} />}
                onPress={fromCamera}
                disabled={busy}
              />
            </View>
            <View className="flex-1">
              <Button
                title={uri ? t('tools.studio.changePhoto') : t('tools.studio.choosePhoto')}
                variant="outline"
                left={<Ionicons name="images" size={16} color={color.ink} />}
                onPress={fromGallery}
                disabled={busy}
              />
            </View>
          </View>
        </Card>

        {/* Property type */}
        <View className="gap-1.5">
          <GroupLabel tone={TONE.type}>{t('tools.studio.propertyType')}</GroupLabel>
          <View className="flex-row flex-wrap gap-2">
            {TYPES.map((x) => (
              <Chip key={x.key} label={x.label} tone={TONE.type} active={type === x.key} onPress={() => selectType(x.key)} />
            ))}
          </View>
        </View>

        {/* Goal */}
        <View className="gap-1.5">
          <GroupLabel tone={TONE.goal}>{t('tools.studio.goal')}</GroupLabel>
          <View className="flex-row flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g.key} label={g.label} tone={TONE.goal} active={goal === g.key} onPress={() => setGoal(g.key)} />
            ))}
          </View>
        </View>

        {/* Style */}
        <View className="gap-1.5">
          <GroupLabel tone={TONE.style}>{t('tools.studio.style')}</GroupLabel>
          <View className="flex-row flex-wrap gap-2">
            {STYLES.map((s) => (
              <Chip key={s} label={s} tone={TONE.style} active={style === s} onPress={() => setStyle(s)} />
            ))}
          </View>
        </View>

        {/* Elements */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text variant="label">{t('tools.studio.addElements')}</Text>
            {elements.length ? (
              <Text className="text-[12px] font-semibold text-red" onPress={() => setElements([])}>
                {t('tools.studio.clear')} ({elements.length})
              </Text>
            ) : null}
          </View>
          {ELEMENTS.map((grp, gi) => (
            <View key={grp.group} className="gap-1">
              <GroupLabel tone={elementTone(gi)} caption>{grp.group}</GroupLabel>
              <View className="flex-row flex-wrap gap-2">
                {grp.items.map((it) => (
                  <Chip key={it} label={it} tone={elementTone(gi)} active={elements.includes(it)} onPress={() => toggleElement(it)} />
                ))}
              </View>
            </View>
          ))}
        </View>

        <Button
          title={busy && !result ? t('tools.studio.rendering') : `✨ ${t('tools.studio.transform')}`}
          loading={busy && !result}
          disabled={!uri || busy}
          onPress={transform}
        />

        {note ? (
          <Card className="border-gold/40 bg-gold/5">
            <Text variant="caption">{note}</Text>
          </Card>
        ) : null}

        {result ? (
          <View className="gap-2">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button title={t('tools.studio.save')} variant="outline" disabled={busy} onPress={onSave} />
              </View>
              <View className="flex-1">
                <Button title={t('tools.studio.share')} disabled={busy} onPress={onShare} />
              </View>
            </View>
            <Button
              title={t('tools.studio.useInPoster')}
              variant="secondary"
              left={<Ionicons name="image" size={16} color={color.ink} />}
              disabled={busy}
              onPress={onUseInPoster}
            />
          </View>
        ) : null}

        <Text variant="caption" className="text-center text-muted">
          {t('tools.studio.disclaimer')}
        </Text>
      </ScrollView>
    </View>
  );
}
