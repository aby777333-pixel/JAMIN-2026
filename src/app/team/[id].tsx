import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { StatCard } from '@/components/ui/StatCard';
import { Text } from '@/components/ui/Text';
import { useMemberStats } from '@/features/team/hooks';
import { formatINR } from '@/lib/money';
import { color } from '@/theme/tokens';

/**
 * Team-member drill-down (§6 Team Monitoring) — per-member sales, earnings, downline
 * and territory. Server enforces the subtree guard (you only see your own team).
 */
export default function TeamMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: m, isLoading, isError } = useMemberStats(id);

  if (isLoading) {
    return (
      <Screen scroll={false} contentClassName="justify-center">
        <ActivityIndicator color={color.red} />
      </Screen>
    );
  }
  if (isError || !m) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Member" />
        <Text variant="body" className="mt-8 text-center text-muted">
          This member isn't in your team, or no longer exists.
        </Text>
      </Screen>
    );
  }

  const initials = (m.full_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const joined = new Date(m.joined_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title="Team member" />

      <Card className="flex-row items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-red/10">
          <Text className="font-bold text-[18px] text-red">{initials}</Text>
        </View>
        <View className="flex-1">
          <Text variant="h2" numberOfLines={1}>
            {m.full_name ?? 'New member'}
          </Text>
          <Text variant="caption">
            Ref {m.referral_code} · joined {joined}
          </Text>
          <View className="mt-1.5 flex-row gap-2">
            <Badge label={m.role ?? 'Member'} />
            {m.territory ? <Badge label={m.territory} tone="reserved" /> : null}
          </View>
        </View>
      </Card>

      <View className="flex-row gap-3">
        <StatCard label="Their sales" icon="trending-up">
          <Text className="font-mono-bold text-[22px] text-ink">{m.sales}</Text>
        </StatCard>
        <StatCard label="Their earnings" icon="cash">
          <Text className="font-mono-bold text-[16px] text-ink">{formatINR(m.earnings)}</Text>
        </StatCard>
      </View>

      <View className="flex-row gap-3">
        <StatCard label="Direct recruits" icon="person-add">
          <Text className="font-mono-bold text-[22px] text-ink">{m.direct}</Text>
        </StatCard>
        <StatCard label="Total team" icon="people">
          <Text className="font-mono-bold text-[22px] text-ink">{m.team}</Text>
        </StatCard>
      </View>

      <StatCard label="Team revenue (their subtree)" icon="bar-chart" dark>
        <Text className="font-mono-bold text-[22px] text-white">{formatINR(m.team_revenue)}</Text>
      </StatCard>

      <Text variant="caption" className="text-center">
        Sales & earnings are this member's own; team figures roll up everyone beneath them.
      </Text>
    </Screen>
  );
}
