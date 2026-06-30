import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import {
  useCreatePaymentLink,
  useMyBookings,
  useSyncBookingPayments,
} from '@/features/payments/hooks';
import type { BookingWithPayments } from '@/features/payments/api';
import { formatINR } from '@/lib/money';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

export default function Payments() {
  const { data: bookings = [], isLoading, refetch, isRefetching } = useMyBookings();
  const createLink = useCreatePaymentLink();
  const sync = useSyncBookingPayments();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onRefresh() {
    // Reconcile any open gateway payments, then refresh the list.
    const open = bookings.filter((b) => b.payments.some((p) => p.status === 'created'));
    await Promise.all(open.map((b) => sync.mutateAsync(b.id).catch(() => null)));
    await refetch();
  }

  async function pay(b: BookingWithPayments) {
    setBusyId(b.id);
    try {
      const existing = b.payments.find((p) => p.status === 'created' && p.short_url);
      let url = existing?.short_url ?? null;
      if (!url) {
        const res = await createLink.mutateAsync(b.id);
        if (!res.configured) {
          Alert.alert('Payment', res.message ?? 'Online payments are not enabled yet.');
          return;
        }
        if (res.error) {
          Alert.alert('Payment', res.error);
          return;
        }
        url = res.short_url ?? null;
      }
      if (url) {
        await Linking.openURL(url);
        Alert.alert('Complete your payment', 'After paying, pull down to refresh the status.');
      }
    } catch (e) {
      Alert.alert('Payment', errMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen scroll={false} contentClassName="gap-0">
      <BackHeader title="Bookings & payments" />
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerClassName="pb-10 gap-3 pt-2"
        showsVerticalScrollIndicator={false}
        onRefresh={onRefresh}
        refreshing={isRefetching || sync.isPending}
        renderItem={({ item }) => {
          const paid = item.payments.some((p) => p.status === 'paid');
          const payable = Number(item.amount) > 0 && !paid && item.status !== 'site_visit';
          const latest = item.payments[0];
          return (
            <Card className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text variant="title" className="font-mono-bold">
                  {item.property?.plot_code ?? 'Booking'}
                </Text>
                <StatusPill status={paid ? 'paid' : item.status} />
              </View>
              {item.property?.project?.name ? (
                <Text variant="caption">{item.property.project.name}</Text>
              ) : null}
              <View className="flex-row items-center justify-between">
                <Text variant="label">{item.status === 'site_visit' ? 'Site visit' : 'Amount'}</Text>
                {Number(item.amount) > 0 ? (
                  <Text className="font-mono-bold text-[16px] text-ink">{formatINR(item.amount)}</Text>
                ) : (
                  <Text variant="caption">—</Text>
                )}
              </View>
              {latest && latest.status !== 'paid' && latest.status !== 'created' ? (
                <Text variant="caption" className="text-danger">
                  Last payment: {latest.status}
                </Text>
              ) : null}
              {payable ? (
                <Button
                  title={busyId === item.id ? 'Opening…' : 'Pay now'}
                  loading={busyId === item.id}
                  onPress={() => pay(item)}
                />
              ) : paid ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkmark-circle" size={18} color={color.success} />
                  <Text className="font-semibold text-success">Paid</Text>
                </View>
              ) : null}
            </Card>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={color.red} />
            </View>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="No bookings yet"
              body="Reserve a property to see it here. Payments and their status will appear once you book."
            />
          )
        }
      />
    </Screen>
  );
}
