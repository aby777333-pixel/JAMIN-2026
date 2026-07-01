import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SARVAM_LANGUAGES, translateText } from '@/features/sarvam/api';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/**
 * Translate — Indian-language text translation via Sarvam AI (modular).
 * Inert until a Sarvam key is configured server-side (shows a friendly note).
 */
export default function TranslateTool() {
  const [text, setText] = useState('');
  const [target, setTarget] = useState('hi-IN');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function onTranslate() {
    if (text.trim().length < 1) {
      Alert.alert('Enter text', 'Type something to translate.');
      return;
    }
    setBusy(true);
    setNote(null);
    setResult(null);
    try {
      const res = await translateText(text.trim(), target);
      if (res.text) setResult(res.text);
      else setNote(res.message ?? 'Could not translate right now.');
    } catch (e) {
      setNote(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4" keyboardAvoiding>
      <BackHeader title="Translate" />
      <Text variant="caption">
        Translate any text into major Indian languages — powered by Sarvam AI.
      </Text>

      <Input
        label="Text"
        placeholder="Type or paste text…"
        value={text}
        onChangeText={setText}
        multiline
        className="h-auto min-h-[96px] py-3"
      />

      <View className="gap-1.5">
        <Text variant="label">Translate to</Text>
        <View className="flex-row flex-wrap gap-2">
          {SARVAM_LANGUAGES.map((l) => (
            <Chip key={l.code} label={l.label} active={target === l.code} onPress={() => setTarget(l.code)} />
          ))}
        </View>
      </View>

      <Button title={busy ? 'Translating…' : 'Translate'} loading={busy} onPress={onTranslate} />

      {note ? (
        <Card className="border-gold/40 bg-gold/5">
          <Text variant="caption">{note}</Text>
        </Card>
      ) : null}

      {result ? (
        <Card className="gap-3">
          <Text variant="label">Translation</Text>
          <Text variant="body" selectable className="text-ink">
            {result}
          </Text>
          <Button
            title="Copy"
            variant="outline"
            left={<Ionicons name="copy-outline" size={16} color={color.ink} />}
            onPress={async () => {
              await Clipboard.setStringAsync(result);
              Alert.alert('Copied');
            }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
