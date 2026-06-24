import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';
import type { PropertyListItem } from '../types';

function firstImage(media: unknown): string | undefined {
  if (Array.isArray(media) && media.length) {
    const m = media[0];
    if (typeof m === 'string') return m;
    if (m && typeof m === 'object' && 'url' in m) return String((m as { url: unknown }).url);
  }
  return undefined;
}

export function PropertyCard({
  item,
  saved,
  onToggleSave,
}: {
  item: PropertyListItem;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const img = firstImage(item.media);
  const customTitle = typeof item.attrs?.title === 'string' ? (item.attrs.title as string) : null;
  return (
    <Pressable
      onPress={() => router.push(`/property/${item.id}`)}
      className="overflow-hidden rounded-2xl border border-line bg-surface">
      <View className="h-36 bg-paper">
        {img ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="image-outline" size={28} color={color.line} />
          </View>
        )}
        <Pressable
          onPress={onToggleSave}
          hitSlop={10}
          className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-surface/90">
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={18}
            color={saved ? color.red : color.ink}
          />
        </Pressable>
        <View className="absolute left-2 top-2">
          <Badge
            label={item.status}
            tone={item.status === 'available' ? 'available' : item.status === 'reserved' ? 'reserved' : 'sold'}
          />
        </View>
      </View>

      <View className="gap-1 p-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-mono-bold text-[13px] text-gold-deep">{item.plot_code}</Text>
          <Text variant="caption">{item.type?.name ?? ''}</Text>
        </View>
        <Text variant="title" numberOfLines={1}>
          {customTitle ?? item.project?.name ?? 'Property'}
        </Text>
        {item.project?.location ? (
          <Text variant="caption" numberOfLines={1}>
            {item.project.location}
          </Text>
        ) : null}
        <MoneyText value={item.price} className="mt-1 text-[18px]" />
      </View>
    </Pressable>
  );
}
