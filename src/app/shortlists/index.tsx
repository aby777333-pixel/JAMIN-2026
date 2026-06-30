import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useCreateShortlist, useJoinShortlist, useMyShortlists } from '@/features/shortlists/hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** Shared shortlists — collaborate with family on a curated set of properties. */
export default function Shortlists() {
  const { data: lists = [], isLoading } = useMyShortlists();
  const create = useCreateShortlist();
  const join = useJoinShortlist();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  async function onCreate() {
    if (!name.trim()) return;
    try {
      const sl = await create.mutateAsync(name.trim());
      setName('');
      router.push(`/shortlists/${sl.id}`);
    } catch (e) {
      Alert.alert('Could not create', errMessage(e));
    }
  }

  async function onJoin() {
    if (!code.trim()) return;
    try {
      const id = await join.mutateAsync(code.trim());
      setCode('');
      router.push(`/shortlists/${id}`);
    } catch (e) {
      Alert.alert('Could not join', errMessage(e));
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Shared shortlists" />
      <Text variant="caption">
        Build a shortlist with family — everyone adds properties, votes 👍/👎 and comments.
      </Text>

      <Card className="gap-3">
        <Text variant="title" className="text-[14px]">Create a shortlist</Text>
        <Input placeholder="e.g. Our new home" value={name} onChangeText={setName} />
        <Button title="Create" loading={create.isPending} onPress={onCreate} />
      </Card>

      <Card className="gap-3">
        <Text variant="title" className="text-[14px]">Join with a code</Text>
        <Input placeholder="Paste share code" value={code} onChangeText={setCode} autoCapitalize="none" />
        <Button title="Join" variant="outline" loading={join.isPending} onPress={onJoin} />
      </Card>

      <Text variant="label">Your shortlists</Text>
      {isLoading ? (
        <ActivityIndicator color={color.red} />
      ) : lists.length === 0 ? (
        <EmptyState icon="heart-circle" title="No shortlists yet" body="Create one above, then add properties from any listing." />
      ) : (
        lists.map((l) => (
          <Pressable key={l.id} onPress={() => router.push(`/shortlists/${l.id}`)}>
            <Card className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="people" size={18} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title" className="text-[14px]">{l.name}</Text>
                <Text variant="caption">{l.item_count} propert{l.item_count === 1 ? 'y' : 'ies'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
