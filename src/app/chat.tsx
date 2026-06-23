import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMessages, useSendMessage, useSupportThread } from '@/features/chat/hooks';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

export default function Chat() {
  const me = useAuth((s) => s.profile)?.id;
  const { data: threadId } = useSupportThread();
  const { data: messages = [], refetch } = useMessages(threadId);
  const send = useSendMessage(threadId);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  // Live updates — refetch on any new message in this thread.
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        () => void refetch(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [threadId, refetch]);

  async function onSend() {
    const body = text.trim();
    if (!body || !threadId) return;
    setText('');
    try {
      await send.mutateAsync(body);
    } catch {
      setText(body);
    }
  }

  return (
    <Screen scroll={false} contentClassName="gap-0">
      <BackHeader title="Live chat — Support" />
      {!threadId ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={color.red} />
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerClassName="py-3 gap-2"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const mine = item.sender_id === me;
              return (
                <View
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                    mine ? 'self-end bg-red' : 'self-start border border-line bg-surface'
                  }`}>
                  <Text className={mine ? 'text-white' : 'text-ink'}>{item.body}</Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text variant="caption" className="mt-12 text-center">
                Say hello 👋 — our team will reply right here.
              </Text>
            }
          />
          <View className="flex-row items-center gap-2 border-t border-line py-2">
            <TextInput
              className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-ink"
              placeholder="Type a message…"
              placeholderTextColor={color.muted}
              value={text}
              onChangeText={setText}
              onSubmitEditing={onSend}
              returnKeyType="send"
              multiline
            />
            <Pressable
              onPress={onSend}
              className="h-11 w-11 items-center justify-center rounded-full bg-red">
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
