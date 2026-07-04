import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Linking, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  type AppNotification,
} from '@/features/notifications/api';
import { color } from '@/theme/tokens';

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  commission: 'cash',
  withdrawal: 'wallet',
  lead: 'people',
  kyc: 'id-card',
  badge: 'trophy',
  booking: 'business',
};

function routeFor(n: AppNotification): string | null {
  switch (n.type) {
    case 'commission':
    case 'withdrawal':
      return '/(tabs)/wallet';
    case 'badge':
      return '/rewards';
    case 'kyc':
      return '/kyc';
    case 'lead':
      return n.data?.lead_id ? `/leads/${n.data.lead_id}` : '/leads';
    default:
      return null;
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { data: items = [], isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <View className="px-5">
        <BackHeader
          title="Notifications"
          right={
            <Pressable onPress={() => markAll.mutate()} hitSlop={8}>
              <Text className="font-semibold text-red">Mark all</Text>
            </Pressable>
          }
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerClassName="px-5 pb-8 gap-2 pt-1"
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => {
          const unread = !item.read_at;
          // Rich broadcasts can carry an image, a file (video/PDF) and a link.
          const imageUrl = typeof item.data?.image_url === 'string' ? item.data.image_url : null;
          const fileUrl = typeof item.data?.file_url === 'string' ? item.data.file_url : null;
          const link = typeof item.data?.link === 'string' ? item.data.link : null;
          const openUrl = link ?? fileUrl;
          return (
            <Pressable
              onPress={() => {
                if (unread) markRead.mutate(item.id);
                const r = routeFor(item);
                if (r) router.push(r as never);
                else if (openUrl) void Linking.openURL(openUrl).catch(() => {});
              }}>
              <Card className={`flex-row items-start gap-3 ${unread ? 'border-red/30 bg-red/5' : ''}`}>
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                  <Ionicons name={ICON[item.type] ?? 'notifications'} size={18} color={color.red} />
                </View>
                <View className="flex-1">
                  <Text variant="title" className="text-[14px]">
                    {item.title}
                  </Text>
                  {item.body ? (
                    <Text variant="caption" numberOfLines={3}>
                      {item.body}
                    </Text>
                  ) : null}
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: '100%', height: 140, borderRadius: 12, marginTop: 6 }}
                      contentFit="cover"
                    />
                  ) : null}
                  {openUrl ? (
                    <View className="mt-1.5 flex-row items-center gap-1">
                      <Ionicons
                        name={fileUrl && !link ? 'document-attach' : 'open-outline'}
                        size={13}
                        color={color.red}
                      />
                      <Text className="text-[12px] font-semibold text-red" numberOfLines={1}>
                        {fileUrl && !link ? 'Open attachment' : 'Open link'}
                      </Text>
                    </View>
                  ) : null}
                  <Text variant="caption" className="mt-0.5 text-[11px]">
                    {new Date(item.created_at).toLocaleString('en-IN')}
                  </Text>
                </View>
                {unread ? <View className="mt-1 h-2.5 w-2.5 rounded-full bg-red" /> : null}
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={color.red} />
            </View>
          ) : (
            <EmptyState icon="notifications-off" title="All caught up" body="New activity will appear here." />
          )
        }
      />
    </View>
  );
}
