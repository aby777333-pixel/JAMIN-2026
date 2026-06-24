import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useBadges, useMyBadges } from '@/features/gamification/api';
import { useIncentiveRules, type IncentiveRule } from '@/features/incentives/api';
import { formatINR } from '@/lib/money';
import { color } from '@/theme/tokens';

const SCOPE_LABEL: Record<string, string> = {
  bonus: 'Performance bonus',
  slab: 'Slab reward',
  team: 'Team override',
};

function summarize(r: IncentiveRule): string {
  const f = r.formula ?? {};
  if (f.type === 'percent') return `${f.value ?? 0}% of sale value`;
  if (f.type === 'flat') return `${formatINR(f.value ?? 0)} flat`;
  if (f.type === 'slab') return `Slab-based · ${f.slabs?.length ?? 0} tiers`;
  return SCOPE_LABEL[r.scope] ?? r.scope;
}

/**
 * Incentives & bonuses (§6) — the active bonus/slab/override programs a partner can
 * earn (dynamic commission_rules), plus a shortcut to claimable badge cash bonuses.
 */
export default function IncentivesScreen() {
  const { data: rules = [], isLoading } = useIncentiveRules();
  const { data: badges = [] } = useBadges();
  const { data: mine = [] } = useMyBadges();

  const earned = new Set(mine.map((m) => m.badge_id));
  const claimed = new Set(mine.filter((m) => m.bonus_claimed_at).map((m) => m.badge_id));
  const claimable = badges.filter((b) => b.bonus > 0 && earned.has(b.id) && !claimed.has(b.id));
  const claimableTotal = claimable.reduce((s, b) => s + b.bonus, 0);

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title="Incentives & bonuses" />

      {/* Claimable badge bonuses → Rewards */}
      <Card className="gap-2 bg-charcoal">
        <View className="flex-row items-center gap-2">
          <Ionicons name="trophy" size={18} color={color.gold} />
          <Text className="font-medium text-[12px] uppercase tracking-[2px] text-gold">
            Reward bonuses
          </Text>
        </View>
        {claimable.length > 0 ? (
          <Text className="text-[14px] text-white">
            You have {claimable.length} unclaimed bonus
            {claimable.length > 1 ? 'es' : ''} worth {formatINR(claimableTotal)}.
          </Text>
        ) : (
          <Text className="text-[13px] text-white/70">
            Earn badges by closing deals, growing your team and referring — each carries a cash bonus.
          </Text>
        )}
        <Text
          onPress={() => router.push('/rewards')}
          className="mt-1 font-semibold text-[13px] text-gold">
          Open Rewards →
        </Text>
      </Card>

      <Text variant="label">Bonus & incentive programs</Text>
      {isLoading ? (
        <ActivityIndicator color={color.red} />
      ) : rules.length === 0 ? (
        <EmptyState
          icon="gift"
          title="No active programs"
          body="Your admin hasn't published bonus or incentive programs yet. They appear here the moment they go live."
        />
      ) : (
        <View className="gap-3">
          {rules.map((r) => (
            <Card key={r.id} className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text variant="title" numberOfLines={1} className="flex-1">
                  {r.name}
                </Text>
                <Badge label={SCOPE_LABEL[r.scope] ?? r.scope} tone="reserved" />
              </View>
              <Text variant="body" className="text-muted">
                {summarize(r)}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <Text variant="caption" className="text-center">
        Programs are configured by your admin and apply automatically when you close a qualifying sale.
      </Text>
    </Screen>
  );
}
