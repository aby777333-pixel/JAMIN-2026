import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { useSetSubmissionStatus, useSubmissions } from '@/features/admin/hooks';
import type { AdminSubmission } from '@/features/admin/api';
import { color } from '@/theme/tokens';

const FILTERS = ['all', 'agent', 'promoter', 'lead', 'property'] as const;

export default function AdminSubmissions() {
  const { data: rows = [], isLoading } = useSubmissions();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const list = filter === 'all' ? rows : rows.filter((r) => r.form_key === filter);

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Form Submissions" />
      <Text variant="caption">
        Every application and enquiry submitted through the dynamic forms lands here for review.
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : list.length === 0 ? (
        <Card>
          <Text variant="body" className="text-muted">
            No submissions yet.
          </Text>
        </Card>
      ) : (
        list.map((row) => <SubmissionCard key={row.id} row={row} />)
      )}
    </Screen>
  );
}

function SubmissionCard({ row }: { row: AdminSubmission }) {
  const setStatus = useSetSubmissionStatus();
  const entries = Object.entries(row.data ?? {});

  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text variant="title" className="capitalize">
            {row.form_key}
          </Text>
          <Text variant="caption">
            {row.user?.full_name ?? 'Member'} · {new Date(row.created_at).toLocaleDateString('en-IN')}
          </Text>
        </View>
        <StatusPill status={row.status} />
      </View>

      {entries.length > 0 ? (
        <View className="gap-1 rounded-xl bg-surface p-3">
          {entries.map(([k, v]) => (
            <View key={k} className="flex-row gap-2">
              <Text variant="caption" className="w-28 capitalize text-muted">
                {k.replace(/_/g, ' ')}
              </Text>
              <Text variant="caption" className="flex-1 text-ink">
                {v == null || v === '' ? '—' : String(v)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-1 flex-row gap-2">
        <Action label="Reviewed" onPress={() => setStatus.mutate({ id: row.id, status: 'reviewed' })} />
        <Action label="Approve" onPress={() => setStatus.mutate({ id: row.id, status: 'approved' })} />
        <Action
          label="Reject"
          danger
          onPress={() => setStatus.mutate({ id: row.id, status: 'rejected' })}
        />
      </View>
    </Card>
  );
}

function Action({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl border px-3 py-2 ${danger ? 'border-danger/40' : 'border-line'}`}>
      <Text className={`font-semibold text-[13px] ${danger ? 'text-danger' : 'text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
