import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import { useMakeOffer } from './hooks';

export function OfferSheet({
  visible,
  onClose,
  propertyId,
  propertyLabel,
  listPrice,
}: {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyLabel: string;
  listPrice?: number;
}) {
  const make = useMakeOffer();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  async function submit() {
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) {
      Alert.alert('Enter an amount', 'Please enter a valid offer amount.');
      return;
    }
    try {
      await make.mutateAsync({ propertyId, amount: a, message: message.trim() || undefined });
      onClose();
      setAmount('');
      setMessage('');
      Alert.alert('Offer sent', 'The seller has been notified. Track it under My offers.');
    } catch (e) {
      Alert.alert('Could not send offer', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Make an offer">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-4">
        <Text variant="caption" className="mb-3">
          {propertyLabel}
          {listPrice ? ` · Asking ₹${listPrice.toLocaleString('en-IN')}` : ''}
        </Text>
        <Input
          label="Your offer (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          inputMode="numeric"
          placeholder="1400000"
        />
        <Input
          label="Message (optional)"
          value={message}
          onChangeText={setMessage}
          placeholder="A note to the seller"
          multiline
          className="mt-3 h-auto min-h-[72px] py-3"
        />
        <Button title="Send offer" loading={make.isPending} onPress={submit} className="mt-4" />
      </ScrollView>
    </Sheet>
  );
}
