import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { StatCard } from '@/components/ui/StatCard';
import { Text } from '@/components/ui/Text';
import { useAdminStats, useAudit } from '@/features/admin/hooks';
import { useLeaderboard } from '@/features/gamification/api';
import { usePipelineSummary } from '@/features/leads/hooks';
import { LEAD_STATUSES } from '@/features/leads/api';
import { color } from '@/theme/tokens';

export default function AdminAnalytics() {
  const { data: s } = useAdminStats();
  const { data: top = [], isLoading } = useLeaderboard('earnings');
  const { data: audit = [] } = useAudit();
  const { data: pipeline = [] } = usePipelineSummary();
  const pipelineMap = new Map(pipeline.map((p) => [p.status, p]));
  const pipelineHasData = pipeline.some((p) => p.lead_count > 0);

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Analytics" />

      <View className="flex-row gap-3">
        <StatCard label="Sold" icon="checkmark-done">
          <Text className="font-mono-bold text-[20px] text-ink">{s?.sold ?? '—'}</Text>
        </StatCard>
        <StatCard label="Available" icon="business">
          <Text className="font-mono-bold text-[20px] text-ink">{s?.available ?? '—'}</Text>
        </StatCard>
        <StatCard label="Leads" icon="flame">
          <Text className="font-mono-bold text-[20px] text-ink">{s?.leads ?? '—'}</Text>
        </StatCard>
      </View>

      <Text variant="label">Deal pipeline (all leads)</Text>
      <Card className="gap-2">
        {pipelineHasData ? (
          LEAD_STATUSES.map((status) => {
            const row = pipelineMap.get(status);
            return (
              <View key={status} className="flex-row items-center justify-between">
                <Text variant="body" className="capitalize">
                  {status} <Text className="text-muted">· {row?.lead_count ?? 0}</Text>
                </Text>
                <MoneyText value={String(row?.total_value ?? 0)} className="text-[13px]" />
              </View>
            );
          })
        ) : (
          <Text variant="body" className="text-muted">
            No leads recorded yet.
          </Text>
        )}
      </Card>

      <Text variant="label">Top performers (earnings)</Text>
      {isLoading ? (
        <ActivityIndicator color={color.red} />
      ) : top.length === 0 ? (
        <Card>
          <Text variant="body" className="text-muted">
            No earnings recorded yet.
          </Text>
        </Card>
      ) : (
        <View className="gap-2">
          {top.slice(0, 8).map((row) => (
            <Card key={row.user_id} className="flex-row items-center gap-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-ink/10">
                <Text className="font-mono-bold text-[13px] text-ink">{row.rank}</Text>
              </View>
              <View className="flex-1">
                <Text variant="title" numberOfLines={1} className="text-[14px]">
                  {row.full_name ?? 'Member'}
                </Text>
                <Text variant="caption">{row.role_name ?? ''}</Text>
              </View>
              <MoneyText value={row.value} className="text-[14px]" />
            </Card>
          ))}
        </View>
      )}

      <Text variant="label" className="mt-2">
        Recent audit log
      </Text>
      <Card className="gap-2">
        {audit.length === 0 ? (
          <Text variant="body" className="text-muted">
            No audit entries yet.
          </Text>
        ) : (
          audit.slice(0, 15).map((a) => (
            <View key={a.id} className="flex-row items-center justify-between border-b border-line pb-1.5">
              <Text variant="body" className="text-[13px]">
                {a.action}
                {a.entity ? ` · ${a.entity}` : ''}
              </Text>
              <Text variant="caption" className="text-[11px]">
                {new Date(a.created_at).toLocaleDateString('en-IN')}
              </Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
