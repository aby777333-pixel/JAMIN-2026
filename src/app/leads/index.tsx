import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { LEAD_STATUSES, type Lead } from '@/features/leads/api';
import { ScoreBandPill } from '@/features/leads/ScoreBandPill';
import { useLeads } from '@/features/leads/hooks';
import { router } from 'expo-router';
import { color } from '@/theme/tokens';

export default function LeadsList() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const { data: leads = [], isLoading, refetch, isRefetching } = useLeads(status);

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <View className="px-5">
        <BackHeader
          title="Leads"
          right={
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => router.push('/cobroke')} hitSlop={10}>
                <Ionicons name="git-network" size={18} color={color.ink} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/leads/pipeline')}
                hitSlop={10}
                className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
                <Ionicons name="git-branch" size={14} color={color.red} />
                <Text className="text-[12px] font-semibold text-ink">Pipeline</Text>
              </Pressable>
            </View>
          }
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 flex-grow-0"
        contentContainerClassName="gap-2 px-5 py-1">
        <Chip label="All" active={!status} onPress={() => setStatus(undefined)} />
        {LEAD_STATUSES.map((s) => (
          <Chip key={s} label={s} active={status === s} onPress={() => setStatus(s)} />
        ))}
      </ScrollView>

      <FlatList
        data={leads}
        keyExtractor={(l) => l.id}
        contentContainerClassName="px-5 pb-8 gap-2 pt-2"
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => <LeadRow lead={item} />}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={color.red} />
            </View>
          ) : (
            <EmptyState
              icon="people"
              title="No leads here"
              body="Buyer enquiries and your captured leads show up here, ready to follow up."
            />
          )
        }
      />
    </View>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const name = lead.contact?.name ?? 'Lead';
  const prop = lead.property ? `${lead.property.project?.name ?? ''} · ${lead.property.plot_code}` : null;
  return (
    <Pressable onPress={() => router.push(`/leads/${lead.id}`)}>
      <Card className="flex-row items-center gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text variant="title" numberOfLines={1} className="flex-shrink">
              {name}
            </Text>
            <ScoreBandPill band={lead.score_band} score={lead.score} />
          </View>
          {prop ? (
            <Text variant="caption" numberOfLines={1}>
              {prop}
            </Text>
          ) : (
            <Text variant="caption">{lead.source ?? 'lead'}</Text>
          )}
        </View>
        <StatusPill status={lead.status} />
      </Card>
    </Pressable>
  );
}
