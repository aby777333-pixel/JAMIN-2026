import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAddAvailability, useDeleteAvailability, useMyAvailability } from '@/features/visits/hooks';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STARTS = ['09:00', '10:00', '11:00', '14:00', '16:00'];
const ENDS = ['12:00', '13:00', '17:00', '18:00', '20:00'];

/** Agents set the weekly windows during which they accept site-visit bookings. */
export default function Availability() {
  const profile = useAuth((s) => s.profile);
  const agentId = profile?.id;
  const { data: rows = [], isLoading } = useMyAvailability(agentId);
  const add = useAddAvailability(agentId ?? '');
  const del = useDeleteAvailability(agentId ?? '');

  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState(STARTS[1]);
  const [end, setEnd] = useState(ENDS[2]);

  if (!can(profile, 'sell')) {
    return (
      <Screen>
        <BackHeader title="Availability" />
        <Text variant="body" className="mt-8 text-center text-muted">
          Availability windows are for agents and partners.
        </Text>
      </Screen>
    );
  }

  async function addWindow() {
    if (end <= start) {
      Alert.alert('Invalid window', 'End time must be after start time.');
      return;
    }
    try {
      await add.mutateAsync({ weekday, start: start + ':00', end: end + ':00' });
    } catch (e) {
      Alert.alert('Could not add', errMessage(e));
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="My availability" />
      <Text variant="caption">
        Buyers booking a visit see these windows. Set when you’re available each week.
      </Text>

      <Card className="gap-3">
        <Text variant="label">Day</Text>
        <View className="flex-row flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <Chip key={d} label={d} active={weekday === i} onPress={() => setWeekday(i)} />
          ))}
        </View>
        <Text variant="label">From</Text>
        <View className="flex-row flex-wrap gap-2">
          {STARTS.map((s) => (
            <Chip key={s} label={s} active={start === s} onPress={() => setStart(s)} />
          ))}
        </View>
        <Text variant="label">To</Text>
        <View className="flex-row flex-wrap gap-2">
          {ENDS.map((e) => (
            <Chip key={e} label={e} active={end === e} onPress={() => setEnd(e)} />
          ))}
        </View>
        <Button title="Add window" variant="outline" loading={add.isPending} onPress={addWindow} />
      </Card>

      <Text variant="label">Your windows</Text>
      {isLoading ? (
        <ActivityIndicator color={color.red} />
      ) : rows.length === 0 ? (
        <Text variant="caption">None yet — add a window above.</Text>
      ) : (
        rows.map((r) => (
          <Card key={r.id} className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text variant="title" className="text-[14px]">
                {DAYS[r.weekday]}
              </Text>
              <Text variant="caption">
                {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
              </Text>
            </View>
            <Pressable onPress={() => del.mutate(r.id)} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={color.muted} />
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}
