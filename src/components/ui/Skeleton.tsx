import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { cn } from '@/lib/cn';

/** Pulsing placeholder block shown while content loads. */
export function Skeleton({
  height = 16,
  className,
  rounded = 'rounded-xl',
}: {
  height?: number;
  className?: string;
  rounded?: string;
}) {
  const v = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View className={cn('bg-ink/10', rounded, className)} style={{ height, opacity: v }} />;
}

/** Card-shaped skeleton matching the property list card. */
export function PropertyCardSkeleton() {
  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Skeleton height={150} rounded="rounded-xl" />
      <Skeleton height={18} className="w-2/3" />
      <View className="flex-row gap-3">
        <Skeleton height={14} className="flex-1" />
        <Skeleton height={14} className="w-16" />
      </View>
    </View>
  );
}
