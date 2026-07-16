import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { usePromoterClients, type ClientKind, type PromoterClient } from '@/features/team/promoter';
import { color } from '@/theme/tokens';

function roleLabel(slug?: string | null) {
  if (!slug) return 'Member';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ClientRow({ c }: { c: PromoterClient }) {
  const { t } = useTranslation();
  const digits = (c.phone ?? '').replace(/[^\d]/g, '');
  const joined = new Date(c.joined_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <Card className="gap-2">
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1">
          <Text variant="title" numberOfLines={1}>
            {c.full_name ?? t('clients.unnamed', { defaultValue: 'New client' })}
          </Text>
        </View>
        {c.phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${c.phone}`)}
            className="h-9 w-9 items-center justify-center rounded-full bg-red/10"
            hitSlop={6}
            accessibilityLabel={t('clients.call', { defaultValue: 'Call' })}>
            <Ionicons name="call" size={16} color={color.red} />
          </Pressable>
        ) : null}
        {digits ? (
          <Pressable
            onPress={() => Linking.openURL(`https://wa.me/${digits}`)}
            className="h-9 w-9 items-center justify-center rounded-full bg-success/15"
            hitSlop={6}
            accessibilityLabel="WhatsApp">
            <Ionicons name="logo-whatsapp" size={16} color={color.success} />
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge label={roleLabel(c.role_slug)} />
        <StatusPill status={c.kyc_status ?? 'unverified'} />
      </View>
      <Text variant="caption">
        {t('clients.joined', { defaultValue: 'Joined {{date}}', date: joined })}
        {c.install_source
          ? ` · ${t('clients.via', { defaultValue: 'via {{source}}', source: c.install_source })}`
          : ''}
      </Text>
      <Text variant="caption">
        {t('clients.openLeads', { defaultValue: '{{count}} open leads', count: c.open_leads })} ·{' '}
        {t('clients.upcomingVisits', {
          defaultValue: '{{count}} upcoming visits',
          count: c.upcoming_visits,
        })}
      </Text>
    </Card>
  );
}

/**
 * My clients (0102) — the promoter's book of buyers and sellers, referral-bound
 * or admin-assigned. Read-only list from promoter_clients() with one-tap
 * call/WhatsApp; leads/visits counts show who needs attention.
 */
export default function Clients() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ClientKind>('buyer');
  const { data: clients = [], isLoading } = usePromoterClients(kind);

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title={t('clients.title', { defaultValue: 'My clients' })} />
      <View className="flex-row gap-2">
        <Chip
          label={t('clients.buyers', { defaultValue: 'Buyers' })}
          active={kind === 'buyer'}
          onPress={() => setKind('buyer')}
        />
        <Chip
          label={t('clients.sellers', { defaultValue: 'Sellers' })}
          active={kind === 'seller'}
          onPress={() => setKind('seller')}
        />
      </View>

      {isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={color.red} />
        </View>
      ) : clients.length === 0 ? (
        <EmptyState
          icon="people"
          title={t('clients.emptyTitle', { defaultValue: 'No clients yet' })}
          body={t('clients.emptyBody', {
            defaultValue:
              'Buyers and sellers appear here when they join through your referral link or are assigned to you by an admin.',
          })}
        />
      ) : (
        clients.map((c) => <ClientRow key={c.client_id} c={c} />)
      )}
    </Screen>
  );
}
