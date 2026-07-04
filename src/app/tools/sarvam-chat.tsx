import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { chatWithSarvam, SARVAM_LANGUAGES, type SarvamChatMessage } from '@/features/sarvam/api';
import { cn } from '@/lib/cn';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** A tidy subset of Sarvam languages for the quick picker (all still supported by the model). */
const QUICK_LANGS = SARVAM_LANGUAGES.filter((l) =>
  ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'ur-IN'].includes(l.code),
);

/**
 * Sarvam AI Chat — an Indian-language real-estate assistant (chat & advice in the
 * user's own language), powered by Sarvam-M. Modular + inert until a Sarvam key
 * is configured server-side (a friendly note appears instead of failing).
 */
export default function SarvamChat() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [lang, setLang] = useState<(typeof QUICK_LANGS)[number]>(
    QUICK_LANGS.find((l) => l.code === 'en-IN') ?? QUICK_LANGS[0],
  );
  const [messages, setMessages] = useState<SarvamChatMessage[]>([
    { role: 'assistant', content: t('tools.sarvamChat.greeting') },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const next: SarvamChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    try {
      const res = await chatWithSarvam(next, lang.label);
      if (res.text) {
        setMessages((m) => [...m, { role: 'assistant', content: res.text as string }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${res.message ?? t('tools.sarvamChat.unavailable')}` }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${errMessage(e)}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <View className="px-5">
        <BackHeader
          title={t('tools.sarvamChat.title')}
          right={
            <Pressable onPress={() => router.push('/tools/sarvam-voice')} hitSlop={8}>
              <Ionicons name="call" size={22} color={color.red} />
            </Pressable>
          }
        />
      </View>

      {/* Language picker */}
      <View className="px-5 pb-1">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
          {QUICK_LANGS.map((l) => (
            <Chip key={l.code} label={l.label} active={lang.code === l.code} onPress={() => setLang(l)} />
          ))}
        </ScrollView>
      </View>

      {/* 'padding' on BOTH platforms: with Android edgeToEdgeEnabled the window
          no longer resizes, so 'height' is a no-op and the keyboard covers the input. */}
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}>
        <ScrollView
          ref={scroller}
          className="flex-1"
          contentContainerClassName="px-5 py-3 gap-3"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
          {messages.map((m, i) => (
            <View
              key={i}
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3',
                m.role === 'user' ? 'self-end bg-red' : 'self-start border border-line bg-surface',
              )}>
              <Text variant="body" className={m.role === 'user' ? 'text-white' : 'text-ink'} selectable>
                {m.content}
              </Text>
            </View>
          ))}
          {busy ? (
            <View className="self-start rounded-2xl border border-line bg-surface px-4 py-3">
              <ActivityIndicator color={color.red} />
            </View>
          ) : null}
        </ScrollView>

        <View
          className="flex-row items-end gap-2 border-t border-line bg-surface px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 8 }}>
          <View className="flex-1">
            <Input
              placeholder={t('tools.sarvamChat.placeholder')}
              value={draft}
              onChangeText={setDraft}
              multiline
              onSubmitEditing={send}
              returnKeyType="send"
            />
          </View>
          <Pressable
            onPress={send}
            disabled={busy}
            className="h-13 min-h-[52px] w-13 min-w-[52px] items-center justify-center rounded-2xl bg-red">
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
