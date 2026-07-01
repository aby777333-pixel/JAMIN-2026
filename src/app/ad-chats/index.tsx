import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useMyAdThreads } from '@/features/adchats/api';
import { color } from '@/theme/tokens';

/** Ad Chats — messages from people who opened the ads you shared. Reply in-app. */
export default function AdChatsList() {
  const insets = useSafeAreaInsets();
  const { data: threads = [], isLoading, refetch, isRefetching } = useMyAdThreads();

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <View className="px-5">
        <BackHeader title="Ad Chats" />
      </View>
      <FlatList
        data={threads}
        keyExtractor={(t) => t.slug}
        contentContainerClassName="px-5 pb-8 gap-3 pt-1"
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={
          <Text variant="caption" className="pb-1">
            People who opened the ads you shared appear here — reply and they’ll see it on the ad page.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/ad-chats/${item.slug}`)}>
            <Card className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="chatbubbles" size={20} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title" className="text-[14px]" numberOfLines={1}>
                  {item.place ?? `Ad ${item.slug}`}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {item.lastBody}
                </Text>
              </View>
              <View className="items-end gap-1">
                <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-ink/10 px-1.5">
                  <Text className="text-[11px] font-semibold text-ink">{item.count}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={color.muted} />
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={color.red} />
            </View>
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No ad chats yet"
              body="Share an ad from the Create Ad or Poster maker — replies from viewers land here."
            />
          )
        }
      />
    </View>
  );
}
