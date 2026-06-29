import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import { useRaiseDispute } from './hooks';

export function ReportSheet({
  visible,
  onClose,
  propertyId,
  propertyLabel,
}: {
  visible: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyLabel?: string;
}) {
  const raise = useRaiseDispute();
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');

  async function submit() {
    if (subject.trim().length < 3) {
      Alert.alert('Add a subject', 'Briefly describe the issue.');
      return;
    }
    try {
      await raise.mutateAsync({ subject: subject.trim(), details: details.trim() || undefined, propertyId });
      onClose();
      setSubject('');
      setDetails('');
      Alert.alert('Reported', 'Thanks — our team will review this and follow up.');
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Report a problem">
      {propertyLabel ? (
        <Text variant="caption" className="mb-3">
          {propertyLabel}
        </Text>
      ) : null}
      <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="e.g. Wrong location / suspicious listing" />
      <Input
        label="Details (optional)"
        value={details}
        onChangeText={setDetails}
        placeholder="Tell us what's wrong"
        multiline
        className="mt-3 h-auto min-h-[88px] py-3"
      />
      <Button title="Submit report" loading={raise.isPending} onPress={submit} className="mt-4" />
    </Sheet>
  );
}
