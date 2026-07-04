import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { BankTransferSheet, type BankDetails } from '@/features/payments/BankTransferSheet';
import { useMyBookings, useSyncBookingPayments } from '@/features/payments/hooks';
import type { BookingWithPayments } from '@/features/payments/api';
import { useConfig } from '@/features/config/hooks';
import { formatINR } from '@/lib/money';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

interface MyTransfer {
  id: string;
  amount: number;
  txn_ref: string | null;
  transfer_date: string | null;
  status: 'pending' | 'verified' | 'rejected';
  review_note: string | null;
  created_at: string;
}

/**
 * Bookings & payments. Payment method for now = BANK TRANSFER ONLY (no online
 * gateway yet): buyers transfer to the JAMIN account (details from the dynamic
 * system_config 'bank_details') and upload a proof; the admin verifies it in
 * the Payments tab, which marks the booking Paid via the normal payments row.
 * The gateway code path (features/payments/api) is kept intact for later.
 */
export default function Payments() {
  const { data: bookings = [], isLoading, refetch, isRefetching } = useMyBookings();
  const sync = useSyncBookingPayments();
  const { data: bank } = useConfig<BankDetails>('bank_details', {});
  // null = closed; { booking } = open (booking may be null for a general proof).
  const [transfer, setTransfer] = useState<{ booking: BookingWithPayments | null } | null>(null);

  const { data: transfers = [], refetch: refetchTransfers } = useQuery({
    queryKey: ['bank_transfers', 'mine'],
    queryFn: async (): Promise<MyTransfer[]> => {
      const { data, error } = await supabase
        .from('bank_transfers')
        .select('id,amount,txn_ref,transfer_date,status,review_note,created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as MyTransfer[];
    },
  });

  async function onRefresh() {
    // Reconcile any open gateway payments (no-op while the gateway is off).
    const open = bookings.filter((b) => b.payments.some((p) => p.status === 'created'));
    await Promise.all(open.map((b) => sync.mutateAsync(b.id).catch(() => null)));
    await Promise.all([refetch(), refetchTransfers()]);
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
        ListHeaderComponent={
          <Card accent={3} className="gap-2">
            <View className="flex-row items-center gap-2">
              <Ionicons name="business" size={18} color={color.goldDeep} />
              <Text variant="title" className="flex-1 text-[15px]">
                Pay by bank transfer
              </Text>
            </View>
            <Text variant="caption">
              {bank?.bank ? `${bank.bank}${bank.branch ? ` · ${bank.branch}` : ''} · A/c ${bank.account ?? ''}` : 'Bank details load here'}
              {'\n'}Transfer from any bank app, then upload your proof — the JAMIN team verifies within 24 hours.
            </Text>
            <Button
              title="🧾 Upload payment proof"
              variant="secondary"
              onPress={() => setTransfer({ booking: null })}
            />
          </Card>
        }
        renderItem={({ item }) => {
          const paid = item.payments.some((p) => p.status === 'paid');
          const payable = Number(item.amount) > 0 && !paid && item.status !== 'site_visit';
          const pendingProof = transfers.some((t) => t.status === 'pending');
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
              {payable ? (
                <Button
                  title="🏦 Pay by bank transfer"
                  onPress={() => setTransfer({ booking: item })}
                />
              ) : paid ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkmark-circle" size={18} color={color.success} />
                  <Text className="font-semibold text-success">Paid</Text>
                </View>
              ) : null}
              {payable && pendingProof ? (
                <Text variant="caption" className="text-muted">
                  A transfer proof is under verification — you'll be notified.
                </Text>
              ) : null}
            </Card>
          );
        }}
        ListFooterComponent={
          transfers.length ? (
            <View className="gap-2 pt-2">
              <Text variant="label">My transfer proofs</Text>
              {transfers.map((t) => (
                <Card key={t.id} className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-mono-bold text-[15px] text-ink">{formatINR(t.amount)}</Text>
                    <StatusPill status={t.status} />
                  </View>
                  <Text variant="caption" className="text-muted">
                    {t.txn_ref ? `UTR ${t.txn_ref} · ` : ''}
                    {t.transfer_date ?? new Date(t.created_at).toLocaleDateString('en-IN')}
                  </Text>
                  {t.status === 'rejected' && t.review_note ? (
                    <Text variant="caption" className="text-danger">
                      {t.review_note}
                    </Text>
                  ) : null}
                </Card>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={color.red} />
            </View>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="No bookings yet"
              body="Reserve a property to see it here. You can still upload a bank-transfer proof any time using the button above."
            />
          )
        }
      />
      <BankTransferSheet
        key={transfer?.booking?.id ?? 'general'}
        visible={!!transfer}
        booking={transfer?.booking ?? null}
        onClose={() => setTransfer(null)}
        onSubmitted={() => void refetchTransfers()}
      />
    </Screen>
  );
}
