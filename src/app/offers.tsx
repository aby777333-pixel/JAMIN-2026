import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMyOffers, useWithdrawOffer } from '@/features/offers/hooks';
import { color } from '@/theme/tokens';

function tone(s: string): 'available' | 'reserved' | 'sold' | 'neutral' {
  if (s === 'accepted') return 'available';
  if (s === 'declined' || s === 'withdrawn') return 'sold';
  return 'reserved';
}

export default function MyOffers() {
  const { data, isLoading } = useMyOffers();
  const withdraw = useWithdrawOffer();
  const offers = data ?? [];

  function onWithdraw(id: string) {
    Alert.alert('Withdraw this offer?', 'The seller will no longer see it as active.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => withdraw.mutate(id) },
    ]);
  }

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title="My offers" />
      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-8" />
      ) : offers.length === 0 ? (
        <Card className="items-center gap-2 py-8">
          <Ionicons name="pricetag-outline" size={28} color={color.muted} />
          <Text variant="title" className="text-[15px]">No offers yet</Text>
          <Text variant="caption" className="text-center">
            Open a property and tap “Make an offer” to start negotiating.
          </Text>
        </Card>
      ) : (
        <View className="gap-3">
          {offers.map((o) => (
            <Card key={o.id} className="gap-2">
              <View className="flex-row items-center justify-between">
                <Pressable onPress={() => router.push(`/property/${o.property_id}`)}>
                  <Text className="font-mono-bold text-[14px] text-gold-deep">
                    {o.property?.plot_code ?? 'Listing'}
                  </Text>
                </Pressable>
                <Badge label={o.status} tone={tone(o.status)} />
              </View>
              <MoneyText value={o.amount} className="text-[20px]" />
              {o.counter_amount ? (
                <Text variant="caption">
                  Seller countered: ₹{Number(o.counter_amount).toLocaleString('en-IN')}
                  {o.counter_message ? ` — ${o.counter_message}` : ''}
                </Text>
              ) : null}
              {o.status === 'pending' || o.status === 'countered' ? (
                <Pressable onPress={() => onWithdraw(o.id)} className="self-start pt-1">
                  <Text className="text-[13px] font-semibold text-danger">Withdraw offer</Text>
                </Pressable>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
