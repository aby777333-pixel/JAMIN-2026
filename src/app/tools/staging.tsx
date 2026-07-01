import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { virtualStage } from '@/features/ai/api';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

const STYLES = ['Modern', 'Minimalist', 'Scandinavian', 'Luxury', 'Traditional Indian'];

/** AI Virtual Staging — furnish an empty room. Activates once an image-gen key is set. */
export default function VirtualStaging() {
  const { t } = useTranslation();
  const [uri, setUri] = useState<string | null>(null);
  const [style, setStyle] = useState('Modern');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled && res.assets[0]) {
      setUri(res.assets[0].uri);
      setResult(null);
      setNote(null);
    }
  }

  async function stage() {
    if (!uri) return;
    setBusy(true);
    setNote(null);
    try {
      const m = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      if (!m.base64) throw new Error('Could not read the image.');
      const res = await virtualStage(m.base64, `Furnish this empty room in a ${style} style, photorealistic.`);
      if (res.url) setResult(res.url);
      setNote(res.message ?? (res.configured ? 'Staging requested.' : 'Not enabled yet.'));
    } catch (e) {
      setNote(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title={t('tools.staging.title')} />
      <Text variant="caption">{t('tools.staging.intro')}</Text>

      <Card className="items-center gap-3">
        {result || uri ? (
          <Image source={{ uri: result ?? (uri as string) }} style={{ width: '100%', height: 220, borderRadius: 14 }} contentFit="cover" />
        ) : (
          <View className="h-52 w-full items-center justify-center rounded-2xl bg-paper">
            <Ionicons name="color-wand" size={32} color={color.gold} />
          </View>
        )}
        <Button title={uri ? t('tools.staging.changePhoto') : t('tools.staging.choosePhoto')} variant="outline" onPress={pick} />
      </Card>

      <View className="gap-1.5">
        <Text variant="label">{t('tools.staging.style')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {STYLES.map((s) => (
            <Chip key={s} label={s} active={style === s} onPress={() => setStyle(s)} />
          ))}
        </View>
      </View>

      <Button title={busy ? t('tools.staging.staging') : `✨ ${t('tools.staging.stage')}`} loading={busy} disabled={!uri} onPress={stage} />
      {note ? (
        <Card>
          <Text variant="caption">{note}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
