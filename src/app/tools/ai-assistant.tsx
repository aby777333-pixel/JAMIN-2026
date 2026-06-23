import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '@/components/ui/BackHeader';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { callAI } from '@/features/ai/api';
import { cn } from '@/lib/cn';
import { color } from '@/theme/tokens';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiAssistant() {
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Hi! I can help with sales advice, objection handling, pricing talk-tracks and more. Ask me anything.' },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    try {
      const res = await callAI('assistant', { messages: next });
      setMessages((m) => [...m, { role: 'assistant', content: res.output }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <View className="px-5">
        <BackHeader title="AI Assistant" />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={insets.top + 8}>
        <ScrollView
          ref={scroller}
          className="flex-1"
          contentContainerClassName="px-5 py-3 gap-3"
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
          {messages.map((m, i) => (
            <View
              key={i}
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3',
                m.role === 'user' ? 'self-end bg-red' : 'self-start bg-surface border border-line',
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
              placeholder="Ask the assistant…"
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
