import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { LEAD_STATUSES, type Lead, type LeadStatus } from '@/features/leads/api';
import { ScoreBandPill } from '@/features/leads/ScoreBandPill';
import { useLeads, useUpdateLeadStatus } from '@/features/leads/hooks';
import { money } from '@/lib/money';
import { color } from '@/theme/tokens';

/**
 * Deal pipeline (CRM kanban). Columns are the dynamic LEAD_STATUSES; each card
 * can advance/retreat a stage (reuses the RLS-safe updateLeadStatus mutation, so
 * the stage-change trigger + audit fire exactly as on the lead detail screen).
 */
export default function Pipeline() {
  const { data: leads = [], isLoading, refetch } = useLeads();
  const updateStatus = useUpdateLeadStatus();

  const columns = useMemo(() => {
    return LEAD_STATUSES.map((status) => {
      const items = leads.filter((l) => l.status === status);
      const total = items.reduce((acc, l) => acc.plus(money(l.value ?? 0)), money(0));
      return { status, items, count: items.length, total: total.toString() };
    });
  }, [leads]);

  function move(lead: Lead, dir: 1 | -1) {
    const idx = LEAD_STATUSES.indexOf(lead.status as LeadStatus);
    const next = LEAD_STATUSES[idx + dir];
    if (!next) return;
    updateStatus.mutate({ id: lead.id, status: next });
  }

  return (
    <View className="flex-1 bg-paper">
      <Screen scroll={false} contentClassName="pt-0">
        <BackHeader
          title="Pipeline"
          right={
            <Pressable onPress={() => refetch()} hitSlop={10}>
              <Ionicons name="refresh" size={18} color={color.ink} />
            </Pressable>
          }
        />
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={color.red} />
          </View>
        ) : leads.length === 0 ? (
          <EmptyState
            icon="git-branch"
            title="No deals yet"
            body="Leads you capture flow through these stages. Move a card as the deal progresses."
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pb-6">
            {columns.map((col) => (
              <View key={col.status} className="w-[260px]">
                <View className="mb-2 flex-row items-center justify-between px-1">
                  <Text variant="label" className="capitalize">
                    {col.status}
                  </Text>
                  <Text variant="caption" className="font-mono">
                    {col.count}
                  </Text>
                </View>
                {col.count > 0 ? (
                  <View className="mb-2 px-1">
                    <MoneyText value={col.total} className="text-[12px] text-muted" />
                  </View>
                ) : null}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  className="max-h-[78%]"
                  contentContainerClassName="gap-2 pb-4">
                  {col.items.map((lead) => (
                    <PipelineCard
                      key={lead.id}
                      lead={lead}
                      canBack={LEAD_STATUSES.indexOf(lead.status as LeadStatus) > 0}
                      canFwd={LEAD_STATUSES.indexOf(lead.status as LeadStatus) < LEAD_STATUSES.length - 1}
                      onBack={() => move(lead, -1)}
                      onFwd={() => move(lead, 1)}
                    />
                  ))}
                  {col.count === 0 ? (
                    <View className="rounded-2xl border border-dashed border-line p-4">
                      <Text variant="caption" className="text-center">
                        Empty
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        )}
      </Screen>
    </View>
  );
}

function PipelineCard({
  lead,
  canBack,
  canFwd,
  onBack,
  onFwd,
}: {
  lead: Lead;
  canBack: boolean;
  canFwd: boolean;
  onBack: () => void;
  onFwd: () => void;
}) {
  const name = lead.contact?.name ?? 'Lead';
  const prop = lead.property ? `${lead.property.project?.name ?? ''} · ${lead.property.plot_code}` : lead.source;
  return (
    <Pressable onPress={() => router.push(`/leads/${lead.id}`)}>
      <Card className="gap-2 p-3">
        <Text variant="title" numberOfLines={1} className="text-[14px]">
          {name}
        </Text>
        <ScoreBandPill band={lead.score_band} score={lead.score} />
        {prop ? (
          <Text variant="caption" numberOfLines={1}>
            {prop}
          </Text>
        ) : null}
        {lead.value ? <MoneyText value={lead.value} className="text-[13px]" /> : null}
        <View className="mt-1 flex-row items-center justify-between">
          <Pressable onPress={onBack} disabled={!canBack} hitSlop={8} className={canBack ? '' : 'opacity-25'}>
            <Ionicons name="chevron-back-circle" size={26} color={color.muted} />
          </Pressable>
          <Pressable onPress={onFwd} disabled={!canFwd} hitSlop={8} className={canFwd ? '' : 'opacity-25'}>
            <Ionicons name="chevron-forward-circle" size={26} color={color.red} />
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}
