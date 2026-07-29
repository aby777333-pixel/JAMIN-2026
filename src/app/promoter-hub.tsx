import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TileGrid, ToolTile } from '@/components/ui/ToolTile';
import {
  useMonthlyEarnings,
  usePromoterDashboard,
  type PromoterDashboard,
} from '@/features/team/promoter';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { category, color } from '@/theme/tokens';

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

/** '12k'-style short amount for the tiny labels above the trend bars. */
function shortAmount(earned: number): string {
  return earned >= 1000 ? `${Math.round(earned / 1000)}k` : String(Math.round(earned));
}

/**
 * Earnings trend (0103) — last 6 months as a pure-RN bar chart. Bars scale to
 * the best month (max ~72px, min 4px); the current month is gold. Renders
 * nothing while loading, on error, or when every month is zero.
 */
function EarningsTrendCard() {
  const { t } = useTranslation();
  const { data } = useMonthlyEarnings();
  if (!data || data.length === 0 || !data.some((m) => m.earned > 0)) return null;

  const max = Math.max(...data.map((m) => m.earned), 1);
  const now = new Date();
  return (
    <Card className="gap-3">
      <Text variant="label">
        {t('promoterHub.earningsTrend', { defaultValue: 'Earnings trend' })}
      </Text>
      <View className="flex-row items-end gap-2">
        {data.map((m) => {
          const date = new Date(m.month);
          const isCurrent =
            date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
          const height = m.earned > 0 ? Math.max(4, Math.round((m.earned / max) * 72)) : 4;
          return (
            <View key={m.month} className="flex-1 items-center gap-1">
              <Text className="font-mono text-[10px] text-muted" numberOfLines={1}>
                {shortAmount(m.earned)}
              </Text>
              <View
                className="w-full rounded-t-md"
                style={{ height, backgroundColor: isCurrent ? color.gold : color.red }}
              />
              <Text variant="caption" className="text-[11px]" numberOfLines={1}>
                {date.toLocaleDateString('en-IN', { month: 'short' })}
              </Text>
            </View>
          );
        })}
      </View>
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

      <EarningsTrendCard />

      {d && Number(d.target_amount) > 0 ? <TargetCard d={d} /> : null}

      <Text variant="label" className="pt-1">
        {t('promoterHub.quickLinks', { defaultValue: 'Workspaces' })}
      </Text>
      <TileGrid>
        <ToolTile
          icon="people"
          label={t('promoterHub.myClients', { defaultValue: 'My clients' })}
          accent={category.team}
          onPress={() => router.push('/clients')}
        />
        <ToolTile
          icon="filter"
          label={t('promoterHub.leads', { defaultValue: 'Leads' })}
          accent={category.sell}
          onPress={() => router.push('/leads')}
        />
        <ToolTile
          icon="person-add"
          label={t('promoterHub.recruit', { defaultValue: 'Recruit team' })}
          accent={category.team}
          onPress={() => router.push('/recruit')}
        />
        <ToolTile
          icon="cash"
          label={t('promoterHub.salesIncome', { defaultValue: 'Sales Income' })}
          accent={category.finance}
          // Typed routes regenerate on the next `expo start`; cast keeps CI green (same idiom as properties.tsx).
          onPress={() => router.push('/income' as never)}
        />
        <ToolTile
          icon="wallet"
          label={t('promoterHub.wallet', { defaultValue: 'Wallet' })}
          accent={category.finance}
          onPress={() => router.push('/(tabs)/wallet')}
        />
        <ToolTile
          icon="document-text"
          label={t('promoterHub.marketing', { defaultValue: 'Marketing' })}
          accent={category.docs}
          onPress={() => router.push('/brochures')}
        />
        <ToolTile
          icon="school"
          label={t('promoterHub.academy', { defaultValue: 'Academy' })}
          accent={category.ai}
          onPress={() => router.push('/academy')}
        />
        <ToolTile
          icon="funnel"
          label={t('promoterHub.referrals', { defaultValue: 'Referrals' })}
          accent={category.marketing}
          onPress={() => router.push('/referrals')}
        />
      </TileGrid>
    </Screen>
  );
}
