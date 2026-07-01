import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, Share, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAIGenerate, type AIFeature } from '@/features/ai/api';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

const FEATURES: { key: AIFeature; label: string }[] = [
  { key: 'description', label: 'Listing description' },
  { key: 'social', label: 'Social post' },
  { key: 'flyer', label: 'Flyer copy' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'video_script', label: 'Video script' },
  { key: 'brochure_copy', label: 'Brochure copy' },
];

export default function AiStudio() {
  const { t } = useTranslation();
  const gen = useAIGenerate();
  const [feature, setFeature] = useState<AIFeature>('description');
  const [context, setContext] = useState('');
  const [project, setProject] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [output, setOutput] = useState<string>();

  async function onGenerate() {
    setOutput(undefined);
    try {
      const res = await gen.mutateAsync({
        feature,
        input: {
          context: context.trim(),
          project: project.trim() || undefined,
          location: location.trim() || undefined,
          price: price.trim() || undefined,
        },
      });
      setOutput(res.output);
    } catch (e) {
      Alert.alert('AI', errMessage(e));
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4" keyboardAvoiding>
      <BackHeader
        title={t('tools.aiStudio.title')}
        right={
          <Pressable onPress={() => router.push('/tools/ai-assistant')} hitSlop={8}>
            <Ionicons name="chatbubbles" size={22} color={color.red} />
          </Pressable>
        }
      />

      <Text variant="caption">{t('tools.aiStudio.intro')}</Text>

      <Pressable onPress={() => router.push('/tools/poster')}>
        <Card className="flex-row items-center gap-3 border-gold/40 bg-gold/5">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-gold/20">
            <Ionicons name="image" size={22} color={color.goldDeep} />
          </View>
          <View className="flex-1">
            <Text variant="title" className="text-[14px]">{t('tools.aiStudio.posterCard')}</Text>
            <Text variant="caption">{t('tools.aiStudio.posterSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.muted} />
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push('/tools/ai-image')}>
        <Card className="flex-row items-center gap-3 border-gold/40 bg-gold/5">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-gold/20">
            <Ionicons name="sparkles" size={22} color={color.goldDeep} />
          </View>
          <View className="flex-1">
            <Text variant="title" className="text-[14px]">{t('tools.aiStudio.imageCard')}</Text>
            <Text variant="caption">{t('tools.aiStudio.imageSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.muted} />
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push('/tools/staging')}>
        <Card className="flex-row items-center gap-3 border-gold/40 bg-gold/5">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-gold/20">
            <Ionicons name="color-wand" size={22} color={color.goldDeep} />
          </View>
          <View className="flex-1">
            <Text variant="title" className="text-[14px]">{t('tools.aiStudio.stagingCard')}</Text>
            <Text variant="caption">{t('tools.aiStudio.stagingSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.muted} />
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push('/tools/translate')}>
        <Card className="flex-row items-center gap-3 border-gold/40 bg-gold/5">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-gold/20">
            <Ionicons name="language" size={22} color={color.goldDeep} />
          </View>
          <View className="flex-1">
            <Text variant="title" className="text-[14px]">{t('tools.aiStudio.translateCard')}</Text>
            <Text variant="caption">{t('tools.aiStudio.translateSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.muted} />
        </Card>
      </Pressable>

      <View className="flex-row flex-wrap gap-2">
        {FEATURES.map((f) => (
          <Chip key={f.key} label={t(`tools.aiStudio.feat.${f.key}`)} active={feature === f.key} onPress={() => setFeature(f.key)} />
        ))}
      </View>

      <Input
        label={t('tools.aiStudio.aboutLabel')}
        placeholder={t('tools.aiStudio.aboutPlaceholder')}
        value={context}
        onChangeText={setContext}
        multiline
        className="h-24 py-3"
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label={t('tools.aiStudio.project')} value={project} onChangeText={setProject} />
        </View>
        <View className="flex-1">
          <Input label={t('tools.aiStudio.location')} value={location} onChangeText={setLocation} />
        </View>
      </View>
      <Input label={t('tools.aiStudio.price')} value={price} onChangeText={setPrice} keyboardType="numeric" />

      <Button title={t('tools.aiStudio.generate')} loading={gen.isPending} onPress={onGenerate} />

      {gen.isPending ? (
        <View className="items-center py-6">
          <ActivityIndicator color={color.red} />
        </View>
      ) : output ? (
        <Card className="gap-3">
          <Text variant="label">{t('tools.aiStudio.result')}</Text>
          <Text variant="body" selectable>
            {output}
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                title={t('tools.aiStudio.copy')}
                variant="outline"
                onPress={async () => {
                  await Clipboard.setStringAsync(output);
                  Alert.alert(t('tools.aiStudio.copied'));
                }}
              />
            </View>
            <View className="flex-1">
              <Button title={t('tools.aiStudio.share')} variant="ghost" onPress={() => Share.share({ message: output })} />
            </View>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
