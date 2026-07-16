import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useFeatureEnabled } from '@/features/catalog/api';
import { useMessages, useSendMessage, useSupportThread } from '@/features/chat/hooks';
import { liveChannel, supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

/**
 * Live chat is feature-flagged (app_features key 'live_chat' — currently OFF
 * per the Buyer module spec). The functionality is fully intact; the Super
 * Admin re-enables it from web admin → Features with no app update. Gating
 * wraps the inner screen so the support thread is never created while hidden.
 */
export default function Chat() {
  const { data: enabled, isLoading } = useFeatureEnabled('live_chat');

  if (isLoading) {
    return (
      <Screen scroll={false} contentClassName="gap-0">
        <BackHeader title="Live chat — Support" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={color.red} />
        </View>
      </Screen>
    );
  }

  if (!enabled) {
    return (
      <Screen scroll={false} contentClassName="gap-0">
        <BackHeader title="Live chat — Support" />
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="chatbubbles-outline" size={40} color={color.muted} />
          <Text variant="title" className="mt-3 text-center">Live chat is not available right now</Text>
          <Text variant="caption" className="mt-1 text-center">
            Please reach us from Help &amp; Support — call, WhatsApp or email.
          </Text>
        </View>
      </Screen>
    );
  }

  return <ChatInner />;
}

function ChatInner() {
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
      .channel(liveChannel(`messages:${threadId}`))
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
          // 'padding' on BOTH platforms: with Android edgeToEdgeEnabled the window
          // no longer resizes, so 'height' is a no-op and the keyboard covers the input.
          behavior="padding">
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
