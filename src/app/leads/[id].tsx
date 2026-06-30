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
  useScoreLead,
  useSetFollowUpStatus,
  useUpdateLeadDeal,
  useUpdateLeadStatus,
} from '@/features/leads/hooks';
import { ScoreBandPill } from '@/features/leads/ScoreBandPill';
import { useEnrollDrip, useSequences } from '@/features/drips/hooks';
import { formatINR, money } from '@/lib/money';
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
  const updateDeal = useUpdateLeadDeal();
  const smartScore = useScoreLead();
  const [scoring, setScoring] = useState(false);

  async function scoreSmart() {
    if (!lead) return;
    try {
      const res = await smartScore.mutateAsync(lead.id);
      const f = res.factors ?? {};
      const lines = [
        `Status: ${f.status ?? 0}`,
        `Phone: ${f.has_phone ?? 0}`,
        `Follow-ups: ${f.followups ?? 0}`,
        `Recency: ${f.recency ?? 0}`,
        `Deal value: ${f.has_value ?? 0}`,
      ].join('\n');
      Alert.alert(`Smart score: ${res.score}/100 (${res.band})`, lines);
    } catch (e) {
      Alert.alert('Smart score', errMessage(e));
    }
  }

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

      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <Ionicons name="sparkles" size={20} color={color.gold} />
          <View className="flex-1">
            <Text variant="title" className="text-[14px]">
              Lead score
            </Text>
            <Text variant="caption">
              {lead.score ? `${lead.score}/100` : 'Rank buyer intent — rules or AI'}
            </Text>
          </View>
          <ScoreBandPill band={lead.score_band} score={lead.score} />
        </View>
        <View className="flex-row gap-2">
          <Button
            title={smartScore.isPending ? '…' : 'Smart score'}
            variant="outline"
            loading={smartScore.isPending}
            onPress={scoreSmart}
            className="flex-1"
          />
          <Button
            title={scoring ? '…' : 'AI score'}
            variant="outline"
            loading={scoring}
            onPress={scoreWithAI}
            className="flex-1"
          />
        </View>
      </Card>

      <DealCard
        value={lead.value}
        expectedClose={lead.expected_close}
        onSave={(value, expected_close) =>
          updateDeal
            .mutateAsync({ id: lead.id, value, expected_close })
            .catch((e) => Alert.alert('Could not save', errMessage(e)))
        }
        pending={updateDeal.isPending}
      />

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

      <DripCard leadId={lead.id} />

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

function DripCard({ leadId }: { leadId: string }) {
  const { data: sequences = [] } = useSequences();
  const enroll = useEnrollDrip();
  if (sequences.length === 0) return null;
  return (
    <Card className="gap-2">
      <Text variant="title" className="text-[14px]">Nurture sequence</Text>
      <Text variant="caption">Auto-schedules follow-up reminders for this lead.</Text>
      <View className="flex-row flex-wrap gap-2">
        {sequences.map((s) => (
          <Chip
            key={s.id}
            label={enroll.isPending ? '…' : s.name}
            onPress={() =>
              enroll
                .mutateAsync({ leadId, sequenceId: s.id })
                .then(() => Alert.alert('Enrolled', `“${s.name}” will drip follow-ups for this lead.`))
                .catch((e) => Alert.alert('Could not enroll', errMessage(e)))
            }
          />
        ))}
      </View>
    </Card>
  );
}

function DealCard({
  value,
  expectedClose,
  onSave,
  pending,
}: {
  value: number | null;
  expectedClose: string | null;
  onSave: (value: number | null, expectedClose: string | null) => void;
  pending: boolean;
}) {
  const [raw, setRaw] = useState(value != null ? String(value) : '');
  const [close, setClose] = useState<string | null>(expectedClose);

  const closeChips = useMemo(() => {
    const out: { label: string; iso: string }[] = [];
    const mk = (d: Date) => d.toISOString().slice(0, 10);
    const eom = new Date();
    eom.setMonth(eom.getMonth() + 1, 0);
    const eonm = new Date();
    eonm.setMonth(eonm.getMonth() + 2, 0);
    const q = new Date();
    q.setDate(q.getDate() + 90);
    out.push({ label: 'This month', iso: mk(eom) });
    out.push({ label: 'Next month', iso: mk(eonm) });
    out.push({ label: '+90 days', iso: mk(q) });
    return out;
  }, []);

  function save() {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? null : money(trimmed).toDecimalPlaces(2).toNumber();
    onSave(Number.isNaN(parsed as number) ? null : parsed, close);
  }

  return (
    <Card className="gap-3">
      <Text variant="title" className="text-[14px]">
        Deal value & close
      </Text>
      <Input
        placeholder="Expected value (₹)"
        keyboardType="numeric"
        value={raw}
        onChangeText={setRaw}
      />
      {raw.trim() ? (
        <Text variant="caption">{formatINR(money(raw.trim() || 0))}</Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {closeChips.map((c) => (
          <Chip key={c.label} label={c.label} active={close === c.iso} onPress={() => setClose(c.iso)} />
        ))}
        {close ? <Chip label="Clear" active={false} onPress={() => setClose(null)} /> : null}
      </View>
      {close ? (
        <Text variant="caption">
          Expected close: {new Date(close).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      ) : null}
      <Button title="Save deal" variant="outline" loading={pending} onPress={save} />
    </Card>
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
