import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';
import { FESTIVALS, upcomingFestival } from './festivals';
import { useFestivals } from './hooks';

/**
 * A festive banner shown on Home when an auspicious festival (Akshaya Tritiya,
 * Dhanteras, Diwali…) is near — traditionally lucky times to buy land & gold.
 * Renders nothing when no festival is within the window. Positive-only.
 */
export function FestivalBanner({ withinDays = 45 }: { withinDays?: number }) {
  const { data: festivals = FESTIVALS } = useFestivals();
  const fest = useMemo(() => upcomingFestival(new Date(), withinDays, festivals), [withinDays, festivals]);
  if (!fest) return null;

  const when =
    fest.inDays === 0 ? 'Today' : fest.inDays === 1 ? 'Tomorrow' : `in ${fest.inDays} days`;

  return (
    <Pressable onPress={() => router.push('/properties')}>
      <View className="gap-1.5 overflow-hidden rounded-2xl border border-gold/50 bg-[#FDF3D8] p-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-[16px]">🪔</Text>
          <Text variant="title" className="flex-1 text-[15px]">
            {fest.name}
          </Text>
          <View className="rounded-full bg-gold/25 px-2.5 py-1">
            <Text className="text-[11px] font-semibold text-gold-deep">{when}</Text>
          </View>
        </View>
        <Text variant="caption" className="text-ink">
          {fest.blurb}
        </Text>
        <View className="flex-row items-center gap-1 pt-0.5">
          <Text className="text-[12px] font-semibold text-red">Explore auspicious plots</Text>
          <Ionicons name="arrow-forward" size={13} color={color.red} />
        </View>
      </View>
    </Pressable>
  );
}
