import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useAdThread, useSendAdReply } from '@/features/adchats/api';
import { color } from '@/theme/tokens';

export default function AdChatThread() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { data: messages = [], isLoading } = useAdThread(slug);
  const send = useSendAdReply(slug);
  const [text, setText] = useState('');

  function onSend() {
    const body = text.trim();
    if (!body || send.isPending) return;
    setText('');
    send.mutate(body);
  }

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <View className="px-5">
        <BackHeader title="Ad Chat" />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}>
        <FlatList
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerClassName="px-5 py-3 gap-2"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const mine = item.sender === 'agent';
            return (
              <View className={mine ? 'items-end' : 'items-start'}>
                <View
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'bg-red' : 'bg-surface border border-line'}`}>
                  {!mine ? (
                    <Text className="mb-0.5 text-[11px] font-semibold text-muted">{item.name ?? 'Visitor'}</Text>
                  ) : null}
                  <Text className={`text-[14px] ${mine ? 'text-white' : 'text-ink'}`}>{item.body}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center py-16">
                <ActivityIndicator color={color.red} />
              </View>
            ) : (
              <EmptyState icon="chatbubble-ellipses-outline" title="No messages yet" body="Say hello to start the conversation." />
            )
          }
        />

        <View
          className="flex-row items-center gap-2 border-t border-line bg-surface px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 8 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a reply…"
            placeholderTextColor={color.muted}
            className="h-11 flex-1 rounded-2xl border border-line bg-paper px-4 text-[15px] text-ink font-sans"
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={onSend}
            disabled={send.isPending || !text.trim()}
            className={`h-11 w-11 items-center justify-center rounded-2xl ${text.trim() ? 'bg-red' : 'bg-line'}`}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
