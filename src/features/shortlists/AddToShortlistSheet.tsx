import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import { useAddShortlistItem, useCreateShortlist, useMyShortlists } from './hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** Pick (or create) a shared shortlist to add this property to. */
export function AddToShortlistSheet({
  visible,
  onClose,
  propertyId,
}: {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
}) {
  const { data: lists = [] } = useMyShortlists();
  const add = useAddShortlistItem();
  const create = useCreateShortlist();
  const [name, setName] = useState('');

  async function addTo(shortlistId: string, label: string) {
    try {
      await add.mutateAsync({ shortlistId, propertyId });
      onClose();
      Alert.alert('Added', `Saved to “${label}”.`);
    } catch (e) {
      Alert.alert('Could not add', errMessage(e));
    }
  }

  async function createAndAdd() {
    if (!name.trim()) return;
    try {
      const sl = await create.mutateAsync(name.trim());
      await add.mutateAsync({ shortlistId: sl.id, propertyId });
      setName('');
      onClose();
      Alert.alert('Added', `Created “${sl.name}” and saved this property.`);
    } catch (e) {
      Alert.alert('Could not create', errMessage(e));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Add to shared shortlist">
      {lists.length > 0 ? (
        <View className="mb-4 gap-2">
          {lists.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => addTo(l.id, l.name)}
              className="flex-row items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <Ionicons name="people" size={18} color={color.red} />
              <Text variant="title" className="flex-1 text-[14px]">{l.name}</Text>
              <Ionicons name="add" size={20} color={color.muted} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Text variant="caption" className="mb-3">No shortlists yet — create one below.</Text>
      )}
      <Text variant="label" className="mb-2">New shortlist</Text>
      <Input placeholder="e.g. Our new home" value={name} onChangeText={setName} />
      <View className="mt-3">
        <Button title="Create & add" loading={create.isPending || add.isPending} onPress={createAndAdd} />
      </View>
    </Sheet>
  );
}
