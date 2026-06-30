import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { useQueryClient } from '@tanstack/react-query';
import { callAI } from '@/features/ai/api';
import { LEAD_STATUSES, setLeadScore, type FollowUp, type LeadStatus } from '@/features/leads/api';
import {
  useCreateFollowUp,
  useFollowUps,
  useLead,
  useSetFollowUpStatus,
  useUpdateLeadStatus,
} from '@/features/leads/hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lead, isLoading } = useLead(id);
  const updateStatus = useUpdateLeadStatus();
  const { data: followUps = [] } = useFollowUps(id);
  const createFollowUp = useCreateFollowUp(id ?? '');
  const setFollowUpStatus = useSetFollowUpStatus(id ?? '');
  const qc = useQueryClient();
  const [scoring, setScoring] = useState(false);

  async function scoreWithAI() {
    if (!lead) return;
    setScoring(true);
    try {
      const res = await callAI('lead_score', {
        name: lead.contact?.name,
        source: lead.source ?? undefined,
        message: JSON.stringify(lead.contact ?? {}),
        context: lead.property ? `${lead.property.project?.name} ${lead.property.plot_code}` : undefined,
      });
      if (res.score != null) {
        await setLeadScore(lead.id, res.score);
        void qc.invalidateQueries({ queryKey: ['lead', lead.id] });
        void qc.invalidateQueries({ queryKey: ['leads'] });
      }
      Alert.alert(`AI score: ${res.score ?? '—'}/100`, res.output);
    } catch (e) {
      Alert.alert('AI', errMessage(e));
    } finally {
      setScoring(false);
    }
  }

  if (isLoading) {
    return (
      <Screen scroll={false} contentClassName="justify-center">
        <ActivityIndicator color={color.red} />
      </Screen>
    );
  }
  if (!lead) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Lead" />
        <Text variant="body" className="mt-8 text-center text-muted">
          Lead not found.
        </Text>
      </Screen>
    );
  }

  const name = lead.contact?.name ?? 'Lead';
  const phone = lead.contact?.phone;
  const extras = Object.entries(lead.contact ?? {}).filter(([k]) => k !== 'name' && k !== 'phone');

  return (
    <Screen contentClassName="pb-10 gap-4" keyboardAvoiding>
      <BackHeader title="Lead" />

      <Card className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text variant="h2">{name}</Text>
          <StatusPill status={lead.status} />
        </View>
        {phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${phone}`)}
            className="flex-row items-center gap-2">
            <Ionicons name="call" size={16} color={color.red} />
            <Text className="font-mono text-[14px] text-red">{phone}</Text>
          </Pressable>
        ) : null}
        <Text variant="caption">
          {lead.source ?? 'lead'} · {new Date(lead.created_at).toLocaleDateString('en-IN')}
        </Text>
        {lead.property ? (
          <Pressable
            onPress={() => lead.property_id && router.push(`/property/${lead.property_id}`)}
            className="mt-1 flex-row items-center justify-between rounded-xl bg-paper p-3">
            <Text variant="title" className="text-[14px]">
              {lead.property.project?.name} · {lead.property.plot_code}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={color.muted} />
          </Pressable>
        ) : null}
        {extras.length > 0 ? (
          <View className="mt-1 gap-1">
            {extras.map(([k, v]) => (
              <Text key={k} variant="caption" className="capitalize">
                {k}: <Text className="text-ink">{String(v)}</Text>
              </Text>
            ))}
          </View>
        ) : null}
      </Card>

      <Card className="flex-row items-center gap-3">
        <Ionicons name="sparkles" size={20} color={color.gold} />
        <View className="flex-1">
          <Text variant="title" className="text-[14px]">
            AI lead score
          </Text>
          <Text variant="caption">
            {lead.score ? `${lead.score}/100 — tap to re-score` : 'Estimate buyer intent with Claude'}
          </Text>
        </View>
        <Button title={scoring ? '…' : 'Score'} variant="outline" loading={scoring} onPress={scoreWithAI} />
      </Card>

      <View>
        <Text variant="label" className="mb-2">
          Update status
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {LEAD_STATUSES.map((s) => (
            <Chip
              key={s}
              label={s}
              active={lead.status === s}
              onPress={() => updateStatus.mutate({ id: lead.id, status: s as LeadStatus })}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text variant="label">Follow-ups</Text>
        {followUps.map((f) => (
          <FollowUpItem
            key={f.id}
            item={f}
            onToggle={() =>
              setFollowUpStatus.mutate({ id: f.id, status: f.status === 'done' ? 'pending' : 'done' })
            }
          />
        ))}
        <AddFollowUp pending={createFollowUp.isPending} onAdd={(dueAt, note) =>
          createFollowUp.mutateAsync({ dueAt, note }).catch((e) =>
            Alert.alert('Could not add', errMessage(e)),
          )
        } />
      </View>
    </Screen>
  );
}

function FollowUpItem({ item, onToggle }: { item: FollowUp; onToggle: () => void }) {
  const done = item.status === 'done';
  return (
    <Card className="flex-row items-center gap-3 py-3">
      <Pressable onPress={onToggle} hitSlop={8}>
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={done ? color.success : color.muted}
        />
      </Pressable>
      <View className="flex-1">
        <Text variant="title" className={`text-[14px] ${done ? 'line-through text-muted' : ''}`}>
          {item.note ?? 'Follow up'}
        </Text>
        <Text variant="caption">
          Due {new Date(item.due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    </Card>
  );
}

function AddFollowUp({
  pending,
  onAdd,
}: {
  pending: boolean;
  onAdd: (dueAt: string, note: string) => void;
}) {
  const [note, setNote] = useState('');
  const [dayIdx, setDayIdx] = useState(1);

  const days = useMemo(() => {
    const out: { label: string; date: Date }[] = [];
    for (let i = 0; i <= 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        date: d,
      });
    }
    return out;
  }, []);

  function add() {
    const d = new Date(days[dayIdx].date);
    d.setHours(10, 0, 0, 0);
    onAdd(d.toISOString(), note.trim() || 'Follow up');
    setNote('');
  }

  return (
    <Card className="gap-3">
      <Text variant="title" className="text-[14px]">
        Schedule a follow-up
      </Text>
      <Input placeholder="Note (e.g. call about pricing)" value={note} onChangeText={setNote} />
      <View className="flex-row flex-wrap gap-2">
        {days.map((d, i) => (
          <Chip key={d.label} label={d.label} active={dayIdx === i} onPress={() => setDayIdx(i)} />
        ))}
      </View>
      <Button title="Add follow-up" variant="outline" loading={pending} onPress={add} />
    </Card>
  );
}
