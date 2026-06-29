import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { ArBoundary } from '@/features/ar/ArBoundary';
import { parseAreaSqm } from '@/features/ar/geo';
import { useProperty } from '@/features/buyer/hooks';

export default function ArScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: property, isLoading } = useProperty(id);
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const lat = property?.coordinates?.lat;
  const lng = property?.coordinates?.lng;
  if (!property || lat == null || lng == null) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Text className="text-center text-white">
          This plot has no location set, so AR boundary isn’t available yet.
        </Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="font-semibold text-white">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const areaSqm = parseAreaSqm((property.attrs ?? {})['Plot area']) || 111; // default ≈ 1200 sq ft

  return (
    <View className="flex-1 bg-black">
      <ArBoundary center={{ lat, lng }} areaSqm={areaSqm} />
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{ position: 'absolute', top: insets.top + 10, left: 16 }}
        className="h-10 w-10 items-center justify-center rounded-full bg-black/50">
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>
      <View style={{ position: 'absolute', top: insets.top + 16, left: 64, right: 16 }} pointerEvents="none">
        <Text className="font-semibold text-white" numberOfLines={1}>
          {property.plot_code} · plot boundary
        </Text>
      </View>
    </View>
  );
}
