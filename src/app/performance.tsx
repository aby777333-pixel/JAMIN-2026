import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { StatCard } from '@/components/ui/StatCard';
import { Text } from '@/components/ui/Text';
import { usePipelineSummary } from '@/features/leads/hooks';
import { LEAD_STATUSES } from '@/features/leads/api';
import { useTeamRoster, useTeamSummary } from '@/features/team/hooks';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';

/** Team-performance dashboard (§ tiered access — Promoter+). Subtree rollup, by rank + territory. */
export default function Performance() {
  const profile = useAuth((s) => s.profile);
  const { data: summary } = useTeamSummary();
  const { data: roster = [] } = useTeamRoster();
  const { data: pipeline = [] } = usePipelineSummary();

  const pipelineByStage = useMemo(() => {
    const m = new Map(pipeline.map((p) => [p.status, p]));
    return LEAD_STATUSES.map((status) => ({
      status,
      count: m.get(status)?.lead_count ?? 0,
      value: m.get(status)?.total_value ?? 0,
    }));
  }, [pipeline]);
  const pipelineHasData = pipeline.some((p) => p.lead_count > 0);

  const byRole = useMemo(() => {
    const m = new Map<string, { count: number; level: number }>();
    roster.forEach((r) => {
      const name = r.role?.name ?? 'Member';
      const level = r.role?.level ?? 99;
      const e = m.get(name) ?? { count: 0, level };
      e.count += 1;
      m.set(name, e);
    });
    return [...m.entries()]
      .map(([name, v]) => ({ name, count: v.count, level: v.level }))
      .sort((a, b) => a.level - b.level);
  }, [roster]);

  const byTerritory = useMemo(() => {
    const m = new Map<string, number>();
    roster.forEach((r) => {
      if (r.territory?.name) m.set(r.territory.name, (m.get(r.territory.name) ?? 0) + 1);
    });
    return [...m.entries()].map(([name, count]) => ({ name, count }));
  }, [roster]);

  const direct = roster.filter((r) => r.parent_id === profile?.id).length;
  const showRegion = can(profile, 'region');
  const scopeWord = can(profile, 'state') ? 'state' : showRegion ? 'region' : 'team';

  if (!can(profile, 'teamAnalytics')) {
    return (
      <Screen>
        <BackHeader title="Performance" />
        <Text variant="body" className="mt-8 text-center text-muted">
          This dashboard is available to Promoters and above.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title={`${scopeWord[0].toUpperCase()}${scopeWord.slice(1)} performance`} />
      <Text variant="caption">Live rollup of your whole {scopeWord} — everyone in your downline.</Text>

      <View className="flex-row gap-3">
        <StatCard label="Members" icon="people">
          <Text className="font-mono-bold text-[18px] text-ink">{summary?.team_count ?? roster.length}</Text>
        </StatCard>
        <StatCard label="Direct recruits" icon="person-add">
          <Text className="font-mono-bold text-[18px] text-ink">{direct}</Text>
        </StatCard>
      </View>
      <View className="flex-row gap-3">
        <StatCard label="Team sales" icon="checkmark-done">
          <Text className="font-mono-bold text-[18px] text-ink">{summary?.team_sales ?? 0}</Text>
        </StatCard>
        <StatCard label="Team revenue" icon="cash">
          <MoneyText value={String(summary?.team_revenue ?? 0)} className="text-[16px]" />
        </StatCard>
      </View>

      <Card className="gap-2.5">
        <Text variant="label">By rank</Text>
        {byRole.length ? (
          byRole.map((r) => (
            <View key={r.name} className="flex-row items-center justify-between">
              <Text variant="body">{r.name}</Text>
              <Text className="font-mono-bold text-ink">{r.count}</Text>
            </View>
          ))
        ) : (
          <Text variant="caption">No team members yet — start recruiting from Network.</Text>
        )}
      </Card>

      {showRegion ? (
        <Card className="gap-2.5">
          <Text variant="label">By territory</Text>
          {byTerritory.length ? (
            byTerritory.map((r) => (
              <View key={r.name} className="flex-row items-center justify-between">
                <Text variant="body">{r.name}</Text>
                <Text className="font-mono-bold text-ink">{r.count}</Text>
              </View>
            ))
          ) : (
            <Text variant="caption">
              No territories assigned yet. Create them in the admin (Territories) and assign members to
              see a region breakdown here.
            </Text>
          )}
        </Card>
      ) : null}

      <Card className="gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text variant="label">Deal pipeline</Text>
          <Pressable onPress={() => router.push('/leads/pipeline')} hitSlop={8}>
            <Text variant="caption" className="text-red">Open board</Text>
          </Pressable>
        </View>
        {pipelineHasData ? (
          pipelineByStage.map((p) => (
            <View key={p.status} className="flex-row items-center justify-between">
              <Text variant="body" className="capitalize">
                {p.status} <Text className="text-muted">· {p.count}</Text>
              </Text>
              <MoneyText value={String(p.value)} className="text-[13px]" />
            </View>
          ))
        ) : (
          <Text variant="caption">No leads in your pipeline yet.</Text>
        )}
      </Card>

      <Button title="View team members" variant="secondary" onPress={() => router.push('/(tabs)/network')} />
    </Screen>
  );
}
