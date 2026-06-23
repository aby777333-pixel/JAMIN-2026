import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
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

const FEATURES: { key: AIFeature; label: string }[] = [
  { key: 'description', label: 'Listing description' },
  { key: 'social', label: 'Social post' },
  { key: 'flyer', label: 'Flyer copy' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'video_script', label: 'Video script' },
  { key: 'brochure_copy', label: 'Brochure copy' },
];

export default function AiStudio() {
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
      Alert.alert('AI', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader
        title="AI Studio"
        right={
          <Pressable onPress={() => router.push('/tools/ai-assistant')} hitSlop={8}>
            <Ionicons name="chatbubbles" size={22} color={color.red} />
          </Pressable>
        }
      />

      <Text variant="caption">
        Generate branded marketing copy with Claude. Pick a type, add a few details, and go.
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {FEATURES.map((f) => (
          <Chip key={f.key} label={f.label} active={feature === f.key} onPress={() => setFeature(f.key)} />
        ))}
      </View>

      <Input
        label="What's it about?"
        placeholder="e.g. premium 2BHK villa, gated community, near IT park"
        value={context}
        onChangeText={setContext}
        multiline
        className="h-24 py-3"
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Project" value={project} onChangeText={setProject} />
        </View>
        <View className="flex-1">
          <Input label="Location" value={location} onChangeText={setLocation} />
        </View>
      </View>
      <Input label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" />

      <Button title="Generate" loading={gen.isPending} onPress={onGenerate} />

      {gen.isPending ? (
        <View className="items-center py-6">
          <ActivityIndicator color={color.red} />
        </View>
      ) : output ? (
        <Card className="gap-3">
          <Text variant="label">Result</Text>
          <Text variant="body" selectable>
            {output}
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                title="Copy"
                variant="outline"
                onPress={async () => {
                  await Clipboard.setStringAsync(output);
                  Alert.alert('Copied');
                }}
              />
            </View>
            <View className="flex-1">
              <Button title="Share" variant="ghost" onPress={() => Share.share({ message: output })} />
            </View>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
