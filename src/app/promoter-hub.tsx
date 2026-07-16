import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { usePromoterDashboard, type PromoterDashboard } from '@/features/team/promoter';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

const PARTNER_SLUGS = ['promoter', 'sub_promoter', 'agent', 'broker'];

/** One tile of the 2-col stat grid — mono numbers, MoneyText for money. */
function Stat({ label, value, money }: { label: string; value: number; money?: boolean }) {
  return (
    <Card className="w-[48%] gap-1 py-3">
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
      {money ? (
        <MoneyText value={value} className="font-mono-bold text-[17px] text-ink" />
      ) : (
        <Text className="font-mono-bold text-[20px] text-ink">{value}</Text>
      )}
    </Card>
  );
}

/** Monthly target card — amount, achieved, % and a slim progress bar. */
function TargetCard({ d }: { d: PromoterDashboard }) {
  const { t } = useTranslation();
  const pct =
    d.achievement_pct != null
      ? Number(d.achievement_pct)
      : d.target_amount > 0
        ? (Number(d.month_earned) / Number(d.target_amount)) * 100
        : 0;
  const width = Math.max(0, Math.min(100, pct));
  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="label">
          {t('promoterHub.monthlyTarget', { defaultValue: 'Monthly target' })}
        </Text>
        <Text className="font-mono-bold text-[13px]" style={{ color: pct >= 100 ? color.goldDeep : color.ink }}>
          {Math.round(pct)}%
        </Text>
      </View>
      <View className="flex-row items-end justify-between">
        <View>
          <Text variant="caption">{t('promoterHub.achieved', { defaultValue: 'Achieved' })}</Text>
          <MoneyText value={d.month_earned} className="font-mono-bold text-[17px] text-ink" />
        </View>
        <View className="items-end">
          <Text variant="caption">{t('promoterHub.target', { defaultValue: 'Target' })}</Text>
          <MoneyText value={d.target_amount} className="font-mono-bold text-[15px] text-muted" />
        </View>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-paper">
        <View
          className="h-2 rounded-full"
          style={{
            width: `${width}%` as const,
            backgroundColor: pct >= 100 ? color.gold : color.red,
          }}
        />
      </View>
      {d.target_sales > 0 ? (
        <Text variant="caption">
          {t('promoterHub.targetSales', {
            defaultValue: '{{closed}} of {{target}} sales closed',
            closed: d.sales_closed,
            target: d.target_sales,
          })}
        </Text>
      ) : null}
    </Card>
  );
}

/**
 * Promoter dashboard (0102) — targets, clients & earnings in one view.
 * Read-only rollup from promoter_dashboard() plus quick links to every
 * partner workspace. Partner-gated; buyers see a quiet caption instead.
 */
export default function PromoterHub() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const isPartner =
    (!!profile?.role_slug && PARTNER_SLUGS.includes(profile.role_slug)) || can(profile, 'sell');
  const { data: d } = usePromoterDashboard();

  if (!isPartner) {
    return (
      <Screen contentClassName="pb-10 gap-3">
        <BackHeader title={t('promoterHub.title', { defaultValue: 'Promoter dashboard' })} />
        <Text variant="caption" className="mt-6 text-center">
          {t('promoterHub.partnerOnly', { defaultValue: 'Partner feature' })}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title={t('promoterHub.title', { defaultValue: 'Promoter dashboard' })} />
      <Text variant="caption">
        {t('promoterHub.subtitle', { defaultValue: 'Targets, clients & earnings in one view.' })}
      </Text>

      <View className="flex-row flex-wrap gap-3">
        <Stat label={t('promoterHub.myBuyers', { defaultValue: 'My buyers' })} value={d?.total_buyers ?? 0} />
        <Stat label={t('promoterHub.mySellers', { defaultValue: 'My sellers' })} value={d?.total_sellers ?? 0} />
        <Stat label={t('promoterHub.activeListings', { defaultValue: 'Active listings' })} value={d?.active_listings ?? 0} />
        <Stat label={t('promoterHub.newLeads', { defaultValue: 'New leads' })} value={d?.new_leads ?? 0} />
        <Stat label={t('promoterHub.followupsDue', { defaultValue: 'Follow-ups due' })} value={d?.pending_followups ?? 0} />
        <Stat label={t('promoterHub.upcomingVisits', { defaultValue: 'Upcoming visits' })} value={d?.upcoming_visits ?? 0} />
        <Stat label={t('promoterHub.salesClosed', { defaultValue: 'Sales closed' })} value={d?.sales_closed ?? 0} />
        <Stat label={t('promoterHub.earned', { defaultValue: 'Earned (lifetime)' })} value={d?.commission_earned ?? 0} money />
        <Stat label={t('promoterHub.thisMonth', { defaultValue: 'This month' })} value={d?.month_earned ?? 0} money />
        <Stat label={t('promoterHub.pendingCommission', { defaultValue: 'Pending commission' })} value={d?.commission_pending ?? 0} money />
        <Stat label={t('promoterHub.walletBalance', { defaultValue: 'Wallet balance' })} value={d?.wallet_balance ?? 0} money />
      </View>

      {d && Number(d.target_amount) > 0 ? <TargetCard d={d} /> : null}

      <Text variant="label" className="pt-1">
        {t('promoterHub.quickLinks', { defaultValue: 'Workspaces' })}
      </Text>
      <ListRow
        icon="people"
        label={t('promoterHub.myClients', { defaultValue: 'My clients' })}
        sub={t('promoterHub.myClientsSub', { defaultValue: 'Buyers and sellers bound to you' })}
        onPress={() => router.push('/clients')}
      />
      <ListRow
        icon="filter"
        label={t('promoterHub.leads', { defaultValue: 'Leads' })}
        sub={t('promoterHub.leadsSub', { defaultValue: 'Pipeline, follow-ups and scoring' })}
        onPress={() => router.push('/leads')}
      />
      <ListRow
        icon="person-add"
        label={t('promoterHub.recruit', { defaultValue: 'Recruit team' })}
        sub={t('promoterHub.recruitSub', { defaultValue: 'Invite partners and track invitations' })}
        onPress={() => router.push('/recruit')}
      />
      <ListRow
        icon="wallet"
        label={t('promoterHub.wallet', { defaultValue: 'Wallet' })}
        sub={t('promoterHub.walletSub', { defaultValue: 'Balance, ledger and withdrawals' })}
        onPress={() => router.push('/(tabs)/wallet')}
      />
      <ListRow
        icon="document-text"
        label={t('promoterHub.marketing', { defaultValue: 'Marketing library' })}
        sub={t('promoterHub.marketingSub', { defaultValue: 'Brochures, flyers and posters' })}
        onPress={() => router.push('/brochures')}
      />
      <ListRow
        icon="school"
        label={t('promoterHub.academy', { defaultValue: 'Academy' })}
        sub={t('promoterHub.academySub', { defaultValue: 'Training and certification' })}
        onPress={() => router.push('/academy')}
      />
      <ListRow
        icon="funnel"
        label={t('promoterHub.referrals', { defaultValue: 'Referral engine' })}
        sub={t('promoterHub.referralsSub', { defaultValue: 'Funnel, campaigns & fraud signals' })}
        onPress={() => router.push('/referrals')}
      />
    </Screen>
  );
}
