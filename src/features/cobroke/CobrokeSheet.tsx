import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import { usePostCobroke } from './hooks';
import { errMessage } from '@/lib/errors';

/** Offer a listing for co-broking with a commission split. */
export function CobrokeSheet({
  visible,
  onClose,
  propertyId,
  propertyLabel,
}: {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyLabel: string;
}) {
  const post = usePostCobroke();
  const [split, setSplit] = useState('50');
  const [note, setNote] = useState('');

  async function submit() {
    const pct = parseFloat(split);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      Alert.alert('Invalid split', 'Enter a split percentage between 0 and 100.');
      return;
    }
    try {
      await post.mutateAsync({ propertyId, splitPct: pct, note: note.trim() || undefined });
      onClose();
      Alert.alert('Posted', 'Your listing is now open for co-broking.');
    } catch (e) {
      Alert.alert('Could not post', errMessage(e));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Offer for co-broking">
      <Text variant="caption" className="mb-3">{propertyLabel}</Text>
      <Text variant="label" className="mb-1">Commission split for the co-broker (%)</Text>
      <Input placeholder="50" value={split} onChangeText={setSplit} keyboardType="numeric" />
      <View className="mt-3">
        <Input placeholder="Note (optional)" value={note} onChangeText={setNote} multiline />
      </View>
      <View className="mt-3">
        <Button title="Post to marketplace" loading={post.isPending} onPress={submit} />
      </View>
    </Sheet>
  );
}
