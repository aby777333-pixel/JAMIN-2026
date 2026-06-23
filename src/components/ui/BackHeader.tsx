import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { color } from '@/theme/tokens';

export function BackHeader({ title, right }: { title?: string; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        hitSlop={12}
        className="h-10 w-10 items-center justify-center rounded-full bg-surface border border-line">
        <Ionicons name="chevron-back" size={20} color={color.ink} />
      </Pressable>
      {title ? (
        <Text variant="title" numberOfLines={1} className="flex-1 px-3">
          {title}
        </Text>
      ) : (
        <View className="flex-1" />
      )}
      <View className="h-10 min-w-[40px] items-end justify-center">{right}</View>
    </View>
  );
}
