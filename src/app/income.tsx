import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { useIncomeHistory, useIncomeSummary } from '@/features/income/hooks';
import type { IncomeBucket, IncomeSummary } from '@/features/income/api';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

const PARTNER_SLUGS = ['promoter', 'sub_promoter', 'agent', 'broker'];

type Segment = 'dsi' | 'rsi' | 'asi' | 'wallet';
type Range = 'all' | 'month' | 'last' | 'quarter';

/** Date-range presets for the transaction filters (ISO yyyy-mm-dd). */
function rangeDates(r: Range): { from: string | null; to: string | null } {
  if (r === 'all') return { from: null, to: null };
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (r === 'month') return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: null };
  if (r === 'last')
    return {
      from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  return { from: iso(new Date(now.getFullYear(), now.getMonth() - 3, 1)), to: null };
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'lock' | 'ok' }) {
  return (
    <Card className="w-[48%] gap-1 py-3">
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
      <MoneyText
        value={value}
        className="font-mono-bold text-[17px]"
        style={tone === 'lock' ? { color: color.warn } : tone === 'ok' ? { color: color.goldDeep } : undefined}
      />
    </Card>
  );
}

/** Current rank + progress toward the next award level. */
function RankCard({ s }: { s: IncomeSummary }) {
  const { t } = useTranslation();
  const st = s.status;
  const next = s.next_level;
  const refs = st?.direct_referrals_count ?? 0;
  const needRefs = next?.min_direct_referrals ?? 3;
  const teamNow = Number(st?.min_referral_team_sales ?? 0);
  const teamNeed = Number(next?.per_referral_team_sales ?? 0);
  const pct = teamNeed > 0 ? Math.max(0, Math.min(100, (teamNow / teamNeed) * 100)) : 0;
  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="label">{t('salesIncome.rank', { defaultValue: 'My designation' })}</Text>
        {st && st.current_level > 0 ? (
          <Text className="font-mono-bold text-[13px]" style={{ color: color.goldDeep }}>
            {t('salesIncome.level', { defaultValue: 'Level {{n}}', n: st.current_level })}
          </Text>
        ) : null}
      </View>
      <Text variant="title" className="text-[17px]">
        {st?.designation ??
          t('salesIncome.noRank', { defaultValue: 'Promoter — keep building your team!' })}
      </Text>
      {next ? (
        <View className="gap-1.5">
          <Text variant="caption">
            {t('salesIncome.nextLevel', {
              defaultValue: 'Next: {{name}} (Level {{n}})',
              name: next.designation,
              n: next.level,
            })}
          </Text>
          <View className="h-2 overflow-hidden rounded-full bg-paper">
            <View
              className="h-2 rounded-full"
              style={{ width: `${pct}%` as const, backgroundColor: pct >= 100 ? color.gold : color.red }}
            />
          </View>
          <Text variant="caption">
            {t('salesIncome.progressRefs', {
              defaultValue: '{{have}}/{{need}} direct referrals · weakest team',
              have: refs,
              need: needRefs,
            })}{' '}
            <MoneyText value={teamNow} className="text-[11px]" /> /{' '}
            <MoneyText value={teamNeed} className="text-[11px]" />
          </Text>
        </View>
      ) : null}
      {s.referral_progress.length > 0 ? (
        <View className="gap-1 pt-1">
          <Text variant="caption">
            {t('salesIncome.teamProgress', { defaultValue: 'Direct referral teams' })}
          </Text>
          {s.referral_progress.slice(0, 6).map((r) => (
            <View key={r.id} className="flex-row items-center justify-between">
              <Text variant="caption" className="flex-1 pr-2" numberOfLines={1}>
                {r.name}
              </Text>
              <MoneyText value={r.team_sales} className="text-[12px]" />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function OfferCard({ o }: { o: IncomeSummary['offers'][number] }) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, (o.my_sales / Math.max(1, o.required_direct_sales)) * 100));
  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="title" className="flex-1 pr-2 text-[15px]" numberOfLines={1}>
          {o.title}
        </Text>
        {o.achieved ? <StatusPill status="won" /> : null}
      </View>
      {o.description ? (
        <Text variant="caption" numberOfLines={3}>
          {o.description}
        </Text>
      ) : null}
      <View className="h-2 overflow-hidden rounded-full bg-paper">
        <View
          className="h-2 rounded-full"
          style={{ width: `${pct}%` as const, backgroundColor: pct >= 100 ? color.gold : color.red }}
        />
      </View>
      <Text variant="caption">
        {t('salesIncome.offerProgress', {
          defaultValue: '{{have}}/{{need}} direct sales · reward: {{reward}}',
          have: o.my_sales,
          need: o.required_direct_sales,
          reward: o.reward_label ?? o.reward_type.replace(/_/g, ' '),
        })}
      </Text>
      <Text variant="caption">
        {t('salesIncome.offerEnds', {
          defaultValue: 'Ends {{date}}',
          date: new Date(o.ends_at).toLocaleDateString('en-IN'),
        })}
      </Text>
    </Card>
  );
}

/**
 * Jamin Bazaar — Sales Income (0109). DSI / RSI / ASI / Wallet submenus with
 * totals, locked-income visibility, date-filtered history, rank progress,
 * awards received and live launch-offer progress. Partner-gated.
 */
export default function SalesIncome() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const isPartner =
    (!!profile?.role_slug && PARTNER_SLUGS.includes(profile.role_slug)) || can(profile, 'sell');
  const [seg, setSeg] = useState<Segment>('dsi');
  const [range, setRange] = useState<Range>('all');
  const { data: s } = useIncomeSummary();
  const dates = useMemo(() => rangeDates(range), [range]);
  const { data: history } = useIncomeHistory({
    type: seg === 'wallet' ? null : seg,
    from: dates.from,
    to: dates.to,
  });

  if (!isPartner) {
    return (
      <Screen contentClassName="pb-10 gap-3">
        <BackHeader title={t('salesIncome.title', { defaultValue: 'Sales Income' })} />
        <Text variant="caption" className="mt-6 text-center">
          {t('salesIncome.partnerOnly', { defaultValue: 'Partner feature' })}
        </Text>
      </Screen>
    );
  }

  const bucket: IncomeBucket | null =
    s == null ? null : seg === 'dsi' ? s.dsi : seg === 'rsi' ? s.rsi : seg === 'asi' ? s.asi : null;

  const segLabels: Record<Segment, string> = {
    dsi: t('salesIncome.dsi', { defaultValue: 'Direct Sales' }),
    rsi: t('salesIncome.rsi', { defaultValue: 'Referral Sales' }),
    asi: t('salesIncome.asi', { defaultValue: 'Awards' }),
    wallet: t('salesIncome.walletTab', { defaultValue: 'Wallet' }),
  };

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title={t('salesIncome.title', { defaultValue: 'Sales Income' })} />
      <Text variant="caption">
        {t('salesIncome.subtitle', {
          defaultValue: 'Jamin Bazaar earnings — direct, referral & award income.',
        })}
      </Text>

      {s ? <RankCard s={s} /> : null}

      <View className="flex-row flex-wrap gap-2">
        {(Object.keys(segLabels) as Segment[]).map((k) => (
          <Chip key={k} label={segLabels[k]} active={seg === k} onPress={() => setSeg(k)} />
        ))}
      </View>

      {seg === 'wallet' ? (
        <View className="flex-row flex-wrap gap-3">
          <Stat label={t('salesIncome.walletBalance', { defaultValue: 'Available balance' })} value={s?.wallet_balance ?? 0} tone="ok" />
          <Stat
            label={t('salesIncome.totalEarnings', { defaultValue: 'Total earnings' })}
            value={
              (Number(s?.dsi.total ?? 0)) + (Number(s?.rsi.total ?? 0)) + (Number(s?.asi.total ?? 0)) + (Number(s?.other.total ?? 0))
            }
          />
          <Stat
            label={t('salesIncome.locked', { defaultValue: 'Locked income' })}
            value={(Number(s?.dsi.locked ?? 0)) + (Number(s?.rsi.locked ?? 0)) + (Number(s?.asi.locked ?? 0))}
            tone="lock"
          />
          <Stat label={t('salesIncome.withdrawn', { defaultValue: 'Withdrawn' })} value={s?.withdrawn ?? 0} />
          <Stat
            label={t('salesIncome.pendingWithdrawals', { defaultValue: 'Pending withdrawals' })}
            value={s?.pending_withdrawals ?? 0}
          />
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          <Stat label={t('salesIncome.totalEarned', { defaultValue: 'Total earned' })} value={bucket?.total ?? 0} />
          <Stat label={t('salesIncome.available', { defaultValue: 'Available' })} value={bucket?.available ?? 0} tone="ok" />
          <Stat label={t('salesIncome.pending', { defaultValue: 'Pending' })} value={bucket?.pending ?? 0} />
          {seg === 'rsi' ? (
            <Stat
              label={t('salesIncome.lockedEligibility', { defaultValue: 'Locked / pending eligibility' })}
              value={bucket?.locked ?? 0}
              tone="lock"
            />
          ) : null}
        </View>
      )}

      {seg === 'rsi' && s?.status && !s.status.rsi_unlocked && Number(s.rsi.locked ?? 0) > 0 ? (
        <Card className="gap-1">
          <Text variant="caption" style={{ color: color.warn }}>
            {t('salesIncome.rsiLockedNote', {
              defaultValue:
                'Complete your first direct sale to unlock referral income. Locked amounts release automatically.',
            })}
          </Text>
        </Card>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {(
          [
            ['all', t('salesIncome.filterAll', { defaultValue: 'All time' })],
            ['month', t('salesIncome.filterMonth', { defaultValue: 'This month' })],
            ['last', t('salesIncome.filterLast', { defaultValue: 'Last month' })],
            ['quarter', t('salesIncome.filterQuarter', { defaultValue: 'Last 3 months' })],
          ] as [Range, string][]
        ).map(([k, label]) => (
          <Chip key={k} label={label} active={range === k} onPress={() => setRange(k)} />
        ))}
      </View>

      <Text variant="label">{t('salesIncome.history', { defaultValue: 'Transaction history' })}</Text>
      {history && history.length > 0 ? (
        <View className="gap-2">
          {history.map((h) => (
            <Card key={`${h.reference_no}-${h.entry_date}`} className="gap-1 py-3">
              <View className="flex-row items-center justify-between">
                <Text variant="title" className="flex-1 pr-2 text-[14px]" numberOfLines={2}>
                  {h.description}
                </Text>
                <MoneyText value={h.amount} className="font-mono-bold text-[15px]" />
              </View>
              <View className="flex-row items-center justify-between">
                <Text variant="caption">
                  {new Date(h.entry_date).toLocaleDateString('en-IN')} · {h.reference_no} ·{' '}
                  {h.income_type.toUpperCase()}
                </Text>
                <StatusPill status={h.status === 'locked' ? 'pending' : h.status} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Text variant="body" className="text-muted">
          {t('salesIncome.noHistory', {
            defaultValue: 'No transactions yet. Income from your sales will appear here.',
          })}
        </Text>
      )}

      {seg === 'asi' && s && s.awards.length > 0 ? (
        <View className="gap-2">
          <Text variant="label">{t('salesIncome.awardsReceived', { defaultValue: 'Awards received' })}</Text>
          {s.awards.map((a) => (
            <Card key={a.id} className="gap-1 py-3">
              <View className="flex-row items-center justify-between">
                <Text variant="title" className="text-[14px]">
                  {a.designation} · L{a.level}
                </Text>
                <StatusPill status={a.status === 'active' ? 'approved' : a.status} />
              </View>
              <Text variant="caption">
                {t('salesIncome.awardDetail', {
                  defaultValue: '{{credited}}/{{total}} months credited · valid till {{date}}',
                  credited: a.months_credited,
                  total: a.months_total,
                  date: new Date(a.valid_until).toLocaleDateString('en-IN'),
                })}{' '}
                · <MoneyText value={a.monthly_amount} className="text-[11px]" />
                {t('salesIncome.perMonth', { defaultValue: '/month' })}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      {s && s.offers.length > 0 ? (
        <View className="gap-2">
          <Text variant="label">{t('salesIncome.launchOffers', { defaultValue: 'Launch offers' })}</Text>
          {s.offers.map((o) => (
            <OfferCard key={o.id} o={o} />
          ))}
        </View>
      ) : null}

      {seg === 'wallet' ? (
        <Card className="gap-1">
          <Text
            variant="caption"
            onPress={() => router.push('/(tabs)/wallet')}
            style={{ color: color.red }}>
            {t('salesIncome.openWallet', {
              defaultValue: 'Open wallet for withdrawals & full statement →',
            })}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
