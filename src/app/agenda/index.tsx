import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMyOpenFollowUps } from '@/features/leads/hooks';
import { useMyVisits } from '@/features/visits/hooks';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

interface AgendaItem {
  id: string;
  when: number;
  kind: 'visit' | 'followup';
  title: string;
  sub: string;
  onPress: () => void;
}

/** Unified agent calendar — upcoming site visits + pending follow-ups by day. */
export default function Agenda() {
  const profile = useAuth((s) => s.profile);
  const { data: visits = [], isLoading: lv } = useMyVisits();
  const { data: followups = [], isLoading: lf } = useMyOpenFollowUps();

  const grouped = useMemo(() => {
    const items: AgendaItem[] = [];
    visits
      .filter((v) => !['completed', 'cancelled', 'no_show'].includes(v.status))
      .forEach((v) => {
        items.push({
          id: `v-${v.id}`,
          when: new Date(v.scheduled_at).getTime(),
          kind: 'visit',
          title: v.property ? `${v.property.project?.name ?? ''} · ${v.property.plot_code}` : 'Site visit',
          sub: `Visit · ${v.buyer?.full_name ?? v.buyer_contact?.name ?? 'Buyer'} · ${v.status}`,
          onPress: () => router.push('/visits'),
        });
      });
    followups.forEach((f) => {
      items.push({
        id: `f-${f.id}`,
        when: new Date(f.due_at).getTime(),
        kind: 'followup',
        title: f.note ?? 'Follow up',
        sub: `Follow-up · ${f.lead?.contact?.name ?? 'Lead'}${f.lead?.property ? ` · ${f.lead.property.plot_code}` : ''}`,
        onPress: () => router.push(`/leads/${f.lead_id}`),
      });
    });
    items.sort((a, b) => a.when - b.when);

    const map = new Map<string, AgendaItem[]>();
    items.forEach((it) => {
      const key = new Date(it.when).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      (map.get(key) ?? map.set(key, []).get(key)!).push(it);
    });
    return [...map.entries()];
  }, [visits, followups]);

  if (!can(profile, 'sell')) {
    return (
      <Screen>
        <BackHeader title="Agenda" />
        <Text variant="body" className="mt-8 text-center text-muted">The agenda is for agents and partners.</Text>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="My agenda" />
      {lv || lf ? (
        <ActivityIndicator color={color.red} className="mt-6" />
      ) : grouped.length === 0 ? (
        <EmptyState icon="calendar-number" title="Nothing scheduled" body="Your upcoming site visits and follow-ups will appear here." />
      ) : (
        grouped.map(([day, items]) => (
          <View key={day} className="gap-2">
            <Text variant="label">{day}</Text>
            {items.map((it) => (
              <Pressable key={it.id} onPress={it.onPress}>
                <Card className="flex-row items-center gap-3">
                  <View className={`h-9 w-9 items-center justify-center rounded-xl ${it.kind === 'visit' ? 'bg-red/10' : 'bg-gold/15'}`}>
                    <Ionicons name={it.kind === 'visit' ? 'location' : 'call'} size={17} color={it.kind === 'visit' ? color.red : color.goldDeep} />
                  </View>
                  <View className="flex-1">
                    <Text variant="title" className="text-[14px]" numberOfLines={1}>{it.title}</Text>
                    <Text variant="caption" numberOfLines={1}>{it.sub}</Text>
                  </View>
                  <Text variant="caption">
                    {new Date(it.when).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}
