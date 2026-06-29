import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMyListingStats } from '@/features/seller/hooks';
import { color } from '@/theme/tokens';

function apprTone(s: string): 'available' | 'reserved' | 'sold' | 'neutral' {
  if (s === 'approved') return 'available';
  if (s === 'rejected') return 'sold';
  if (s === 'pending') return 'reserved';
  return 'neutral';
}

export default function MyListings() {
  const { data, isLoading, refetch, isRefetching } = useMyListingStats();
  const listings = data ?? [];

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title="My listings" />

      <Button
        title="List a new property"
        left={<Ionicons name="add-circle" size={18} color="#FFFFFF" />}
        onPress={() => router.push('/sell/new')}
      />

      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-8" />
      ) : listings.length === 0 ? (
        <Card className="items-center gap-2 py-8">
          <Ionicons name="home-outline" size={28} color={color.muted} />
          <Text variant="title" className="text-[15px]">No listings yet</Text>
          <Text variant="caption" className="text-center">
            Tap “List a new property” to submit your first plot. An admin reviews it before it goes live.
          </Text>
        </Card>
      ) : (
        <View className="gap-3">
          <Pressable onPress={() => refetch()} className="flex-row items-center gap-1 self-end">
            <Ionicons name="refresh" size={14} color={color.muted} />
            <Text variant="caption">{isRefetching ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
          {listings.map((l) => (
            <Pressable key={l.property_id} onPress={() => router.push(`/property/${l.property_id}`)}>
              <Card className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-mono-bold text-[14px] text-gold-deep">{l.plot_code}</Text>
                  <View className="flex-row gap-1.5">
                    <Badge label={l.approval_status} tone={apprTone(l.approval_status)} />
                    <Badge
                      label={l.status}
                      tone={l.status === 'available' ? 'available' : l.status === 'reserved' ? 'reserved' : 'sold'}
                    />
                  </View>
                </View>
                <MoneyText value={l.price} className="text-[20px]" />
                <View className="flex-row flex-wrap gap-y-2">
                  <Stat label="Views" value={l.views} />
                  <Stat label="Enquiries" value={l.enquiries} />
                  <Stat label="Saved" value={l.saves} />
                  <Stat label="Bookings" value={l.bookings} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="w-1/4 items-center">
      <Text className="font-mono-bold text-[18px] text-ink">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}
