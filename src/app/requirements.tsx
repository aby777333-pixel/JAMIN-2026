import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { usePropertyTypes } from '@/features/buyer/hooks';
import {
  useCreateRequirement,
  useDeleteRequirement,
  useMyRequirements,
  useRequirementMatchCounts,
  useSetRequirementNotify,
} from '@/features/requirements/hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

const PURPOSES = ['Investment', 'Residential'];

export default function Requirements() {
  const { data: types = [] } = usePropertyTypes();
  const { data: reqs = [], isLoading } = useMyRequirements();
  const { data: matchCounts = {} } = useRequirementMatchCounts();
  const create = useCreateRequirement();
  const del = useDeleteRequirement();
  const setNotify = useSetRequirementNotify();

  const [location, setLocation] = useState('');
  const [bmin, setBmin] = useState('');
  const [bmax, setBmax] = useState('');
  const [typeId, setTypeId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string | null>(null);

  async function add() {
    try {
      await create.mutateAsync({
        location: location.trim() || undefined,
        budgetMin: bmin ? parseFloat(bmin) : null,
        budgetMax: bmax ? parseFloat(bmax) : null,
        propertyTypeId: typeId,
        purpose: purpose ?? undefined,
      });
      setLocation('');
      setBmin('');
      setBmax('');
      setTypeId(null);
      setPurpose(null);
      Alert.alert('Saved', 'We’ll notify you when a matching property is listed.');
    } catch (e) {
      Alert.alert('Could not save', errMessage(e));
    }
  }

  return (
    <Screen contentClassName="pb-12 gap-4" keyboardAvoiding>
      <BackHeader title="Property requirements" />
      <Text variant="caption">
        Tell us what you’re looking for — Property Radar notifies you the moment a new matching listing goes live,
        and again whenever a matching property drops in price.
      </Text>

      <Card className="gap-3">
        <Input label="Preferred location / area" value={location} onChangeText={setLocation} placeholder="e.g. Whitefield, Bengaluru" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Budget min (₹)" value={bmin} onChangeText={setBmin} keyboardType="numeric" inputMode="numeric" placeholder="2000000" />
          </View>
          <View className="flex-1">
            <Input label="Budget max (₹)" value={bmax} onChangeText={setBmax} keyboardType="numeric" inputMode="numeric" placeholder="5000000" />
          </View>
        </View>
        <View className="gap-1.5">
          <Text variant="label">Property type</Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip label="Any" active={!typeId} onPress={() => setTypeId(null)} />
            {types.map((t) => (
              <Chip key={t.id} label={t.name} active={typeId === t.id} onPress={() => setTypeId(t.id)} />
            ))}
          </View>
        </View>
        <View className="gap-1.5">
          <Text variant="label">Purpose</Text>
          <View className="flex-row gap-2">
            {PURPOSES.map((p) => (
              <Chip key={p} label={p} active={purpose === p} onPress={() => setPurpose(purpose === p ? null : p)} />
            ))}
          </View>
        </View>
        <Button title="Save requirement" loading={create.isPending} onPress={add} />
      </Card>

      <Text variant="label">Saved requirements</Text>
      {isLoading ? (
        <ActivityIndicator color={color.red} />
      ) : reqs.length === 0 ? (
        <Text variant="caption">None yet — add one above to get matched.</Text>
      ) : (
        reqs.map((r) => (
          <Card key={r.id} className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text variant="title" className="text-[14px]">{r.location || 'Any location'}</Text>
              <Text variant="caption">
                {r.budget_min || r.budget_max
                  ? `₹${Number(r.budget_min || 0).toLocaleString('en-IN')} – ${r.budget_max ? '₹' + Number(r.budget_max).toLocaleString('en-IN') : 'any'}`
                  : 'Any budget'}
                {r.purpose ? ` · ${r.purpose}` : ''}
              </Text>
              {matchCounts[r.id] ? (
                <Text variant="caption" className="mt-0.5 text-success">
                  {matchCounts[r.id]} match{matchCounts[r.id] === 1 ? '' : 'es'} so far
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => setNotify.mutate({ id: r.id, notify: !r.notify })}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full bg-paper">
              <Ionicons
                name={r.notify ? 'notifications' : 'notifications-off-outline'}
                size={17}
                color={r.notify ? color.red : color.muted}
              />
            </Pressable>
            <Pressable onPress={() => del.mutate(r.id)} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={color.muted} />
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}
