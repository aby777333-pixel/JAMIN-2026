import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { AuspiciousDatesCard } from '@/features/astro/AuspiciousDatesCard';
import { useMyEscrow, useSetEscrowStatus } from '@/features/escrow/hooks';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

/** Escrow & token milestones — staged booking payments with controlled release. */
export default function Escrow() {
  const { t, i18n } = useTranslation();
  const myId = useAuth((s) => s.profile?.id);
  const { data: rows = [], isLoading } = useMyEscrow();
  const setStatus = useSetEscrowStatus();
  // Due-date chips in the active language ('hi-IN' → Devanagari digits/months).
  const locale = `${(i18n.language || 'en').slice(0, 2)}-IN`;

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title={t('escrow.title')} />
      <Text variant="caption">{t('escrow.intro')}</Text>

      <AuspiciousDatesCard
        title={t('astro.dates.escrowTitle')}
        subtitle={t('astro.dates.escrowSubtitle')}
      />

      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-6" />
      ) : rows.length === 0 ? (
        <EmptyState icon="lock-closed" title={t('escrow.emptyTitle')} body={t('escrow.emptyBody')} />
      ) : (
        rows.map((m) => {
          const isAgent = m.booking?.agent_id === myId;
          const label = m.booking?.property ? `${m.booking.property.project?.name ?? ''} · ${m.booking.property.plot_code}` : t('escrow.booking');
          return (
            <Card key={m.id} className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text variant="title" className="flex-1 text-[14px]">{m.title}</Text>
                <StatusPill status={m.status} />
              </View>
              <Text variant="caption">{label}{m.due_date ? ` · ${t('escrow.due', { date: new Date(m.due_date).toLocaleDateString(locale) })}` : ''}</Text>
              <MoneyText value={m.amount} className="text-[16px]" />
              {isAgent ? (
                <View className="flex-row flex-wrap gap-2 pt-1">
                  {m.status === 'pending' ? (
                    <Button title={t('escrow.markFunded')} variant="outline" className="h-9 flex-grow" onPress={() => setStatus.mutate({ id: m.id, status: 'funded' })} />
                  ) : null}
                  {m.status === 'funded' ? (
                    <Button title={t('escrow.release')} variant="secondary" className="h-9 flex-grow" onPress={() => setStatus.mutate({ id: m.id, status: 'released' })} />
                  ) : null}
                  {m.status !== 'released' && m.status !== 'refunded' ? (
                    <Button title={t('escrow.refund')} variant="ghost" className="h-9 flex-grow" onPress={() => setStatus.mutate({ id: m.id, status: 'refunded' })} />
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })
      )}
      <View className="flex-row items-center gap-2">
        <Ionicons name="information-circle-outline" size={14} color={color.muted} />
        <Text variant="caption" className="flex-1">{t('escrow.gatewayNote')}</Text>
      </View>
    </Screen>
  );
}
