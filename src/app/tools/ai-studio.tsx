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

type Tool = {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  subKey: string;
  route: string;
};

const SECTIONS: { titleKey: string; tools: Tool[] }[] = [
  {
    titleKey: 'tools.aiStudio.secCreate',
    tools: [
      { icon: 'sparkles', titleKey: 'tools.aiStudio.imageCard', subKey: 'tools.aiStudio.imageSub', route: '/tools/ai-image' },
      { icon: 'color-wand', titleKey: 'tools.aiStudio.stagingCard', subKey: 'tools.aiStudio.stagingSub', route: '/tools/staging' },
      { icon: 'images', titleKey: 'tools.aiStudio.posterCard', subKey: 'tools.aiStudio.posterSub', route: '/tools/poster' },
    ],
  },
  {
    titleKey: 'tools.aiStudio.secCapture',
    tools: [
      { icon: 'camera', titleKey: 'tools.aiStudio.adCard', subKey: 'tools.aiStudio.adSub', route: '/tools/ad-creator' },
    ],
  },
  {
    titleKey: 'tools.aiStudio.secLanguage',
    tools: [
      { icon: 'chatbubble-ellipses', titleKey: 'tools.aiStudio.sarvamCard', subKey: 'tools.aiStudio.sarvamSub', route: '/tools/sarvam-chat' },
      { icon: 'language', titleKey: 'tools.aiStudio.translateCard', subKey: 'tools.aiStudio.translateSub', route: '/tools/translate' },
    ],
  },
];

/** A capability chip for the footer strip (matches the AI suite vision). */
const CAPS = [
  { icon: 'videocam' as const, key: 'tools.aiStudio.capVideo' },
  { icon: 'camera' as const, key: 'tools.aiStudio.capCamera' },
  { icon: 'sparkles' as const, key: 'tools.aiStudio.capImage' },
  { icon: 'language' as const, key: 'tools.aiStudio.capTranslate' },
  { icon: 'chatbubbles' as const, key: 'tools.aiStudio.capChat' },
  { icon: 'color-wand' as const, key: 'tools.aiStudio.capStage' },
];

function ToolCard({ tool }: { tool: Tool }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={() => router.push(tool.route as never)}>
      <Card className="flex-row items-center gap-3 border-gold/40 bg-gold/5">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-gold/20">
          <Ionicons name={tool.icon} size={22} color={color.goldDeep} />
        </View>
        <View className="flex-1">
          <Text variant="title" className="text-[14px]">{t(tool.titleKey)}</Text>
          <Text variant="caption">{t(tool.subKey)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={color.muted} />
      </Card>
    </Pressable>
  );
}

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

      {SECTIONS.map((section) => (
        <View key={section.titleKey} className="gap-2">
          <Text variant="label" className="uppercase tracking-[1px] text-muted">{t(section.titleKey)}</Text>
          {section.tools.map((tool) => (
            <ToolCard key={tool.route} tool={tool} />
          ))}
        </View>
      ))}

      {/* Capability footer strip */}
      <View className="flex-row flex-wrap gap-2 rounded-2xl border border-line bg-surface p-3">
        {CAPS.map((c) => (
          <View key={c.key} className="flex-row items-center gap-1.5 rounded-full bg-paper px-2.5 py-1">
            <Ionicons name={c.icon} size={13} color={color.red} />
            <Text className="text-[11px] font-medium text-ink">{t(c.key)}</Text>
          </View>
        ))}
      </View>

      {/* AI Copywriter */}
      <View className="gap-2 pt-1">
        <Text variant="label" className="uppercase tracking-[1px] text-muted">{t('tools.aiStudio.secWrite')}</Text>
        <Text variant="caption">{t('tools.aiStudio.writeIntro')}</Text>
      </View>

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
