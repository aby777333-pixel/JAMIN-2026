import { ActivityIndicator, Alert, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import {
  useCloseSale,
  useOpenBookings,
  usePendingWithdrawals,
  useSetWithdrawalStatus,
} from '@/features/admin/hooks';
import { formatINR } from '@/lib/money';
import { color } from '@/theme/tokens';

export default function AdminApprovals() {
  const { data: withdrawals = [], isLoading: lw } = usePendingWithdrawals();
  const { data: bookings = [], isLoading: lb } = useOpenBookings();
  const setStatus = useSetWithdrawalStatus();
  const closeSale = useCloseSale();

  function onCloseSale(id: string, label: string) {
    Alert.alert('Close this sale?', `${label}\nThis marks the plot sold and pays commissions.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close sale',
        onPress: () =>
          closeSale
            .mutateAsync(id)
            .then((total) => Alert.alert('Sale closed', `Commissions paid: ${formatINR(total)}`))
            .catch((e) => Alert.alert('Failed', e instanceof Error ? e.message : String(e))),
      },
    ]);
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Approvals" />

      <Text variant="label">Withdrawal requests</Text>
      {lw ? (
        <ActivityIndicator color={color.red} />
      ) : withdrawals.length === 0 ? (
        <Card>
          <Text variant="body" className="text-muted">
            No pending payouts.
          </Text>
        </Card>
      ) : (
        withdrawals.map((w) => (
          <Card key={w.id} className="gap-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text variant="title">{w.user?.full_name ?? 'Member'}</Text>
                <MoneyText value={w.amount} className="text-[15px]" />
              </View>
              <StatusPill status={w.status} />
            </View>
            <View className="flex-row gap-3">
              {w.status === 'requested' ? (
                <>
                  <View className="flex-1">
                    <Button title="Approve" variant="secondary" onPress={() => setStatus.mutate({ id: w.id, status: 'approved' })} />
                  </View>
                  <View className="flex-1">
                    <Button title="Reject" variant="outline" onPress={() => setStatus.mutate({ id: w.id, status: 'rejected' })} />
                  </View>
                </>
              ) : (
                <View className="flex-1">
                  <Button title="Mark as paid" onPress={() => setStatus.mutate({ id: w.id, status: 'paid' })} />
                </View>
              )}
            </View>
          </Card>
        ))
      )}

      <Text variant="label" className="mt-2">
        Open bookings — close sale
      </Text>
      {lb ? (
        <ActivityIndicator color={color.red} />
      ) : bookings.length === 0 ? (
        <Card>
          <Text variant="body" className="text-muted">
            No open bookings to close.
          </Text>
        </Card>
      ) : (
        bookings.map((b) => {
          const label = `${b.property?.project?.name ?? ''} · ${b.property?.plot_code ?? ''}`;
          return (
            <Card key={b.id} className="gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text variant="title" numberOfLines={1}>
                    {label}
                  </Text>
                  <Text variant="caption">
                    {b.agent?.full_name ? `Agent: ${b.agent.full_name} · ` : ''}
                    {b.status}
                  </Text>
                </View>
                {b.amount ? <MoneyText value={b.amount} className="text-[14px]" /> : null}
              </View>
              <Button
                title="Close sale & pay commissions"
                loading={closeSale.isPending}
                onPress={() => onCloseSale(b.id, label)}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
