import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { askAboutProperty, estimateFairPrice, translateListing, type PropAiCtx } from './property';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

const LANGS = ['Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'];

/** AI helpers for a single listing: Q&A, fair-price estimate, translation. */
export function AiPropertyPanel({ ctx, description }: { ctx: PropAiCtx; description?: string | null }) {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'ask' | 'price' | 'translate'>(null);

  async function run(kind: 'ask' | 'price' | 'translate', lang?: string) {
    setBusy(kind);
    setAnswer(null);
    try {
      const out =
        kind === 'ask'
          ? await askAboutProperty(ctx, q.trim())
          : kind === 'price'
            ? await estimateFairPrice(ctx)
            : await translateListing(ctx, lang as string, description);
      setAnswer(out);
    } catch (e) {
      setAnswer(`⚠️ ${errMessage(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-2">
        <Ionicons name="sparkles" size={18} color={color.gold} />
        <Text variant="title" className="text-[14px]">Ask AI about this property</Text>
      </View>

      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <Input placeholder="e.g. Is this good for investment?" value={q} onChangeText={setQ} multiline />
        </View>
        <Button title="Ask" variant="outline" className="h-12" loading={busy === 'ask'} onPress={() => q.trim() && run('ask')} />
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Button title="Fair-price estimate" variant="outline" className="h-10" loading={busy === 'price'} onPress={() => run('price')} />
      </View>

      <View className="gap-1.5">
        <Text variant="caption">Translate listing</Text>
        <View className="flex-row flex-wrap gap-2">
          {LANGS.map((l) => (
            <Chip key={l} label={l} onPress={() => run('translate', l)} />
          ))}
        </View>
      </View>

      {busy ? (
        <ActivityIndicator color={color.red} />
      ) : answer ? (
        <View className="rounded-xl bg-paper p-3">
          <Text variant="body" className="text-[13px]" selectable>{answer}</Text>
        </View>
      ) : null}
      <Text variant="caption" className="text-muted">AI responses can be imperfect — confirm specifics with the agent.</Text>
    </Card>
  );
}
