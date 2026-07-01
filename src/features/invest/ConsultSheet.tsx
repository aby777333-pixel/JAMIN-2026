import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import { CONSULT_TOPICS, requestConsult } from './consult';
import { useAuth } from '@/stores/auth';
import { errMessage } from '@/lib/errors';

/**
 * "Talk to an expert" — a small sheet that files a Vastu/astrology/investment
 * consultation request into the leads pipeline (visible to the admin CRM).
 */
export function ConsultSheet({
  visible,
  onClose,
  propertyId,
  defaultTopic = 'Vastu',
}: {
  visible: boolean;
  onClose: () => void;
  propertyId?: string | null;
  defaultTopic?: string;
}) {
  const profile = useAuth((s) => s.profile);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [topic, setTopic] = useState(defaultTopic);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Add your details', 'Please enter your name and phone number.');
      return;
    }
    setBusy(true);
    try {
      await requestConsult({ name: name.trim(), phone: phone.trim(), topic, note: note.trim(), propertyId });
      onClose();
      Alert.alert('Request sent 🙏', 'Our team will reach out to arrange your consultation.');
    } catch (e) {
      Alert.alert('Could not send', errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Talk to an expert">
      <Text variant="caption" className="mb-3">
        Get guidance on Vastu, muhurat, numerology or investment — our team will call you back.
      </Text>

      <Text variant="label" className="mb-2">
        Topic
      </Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {CONSULT_TOPICS.map((tp) => (
          <Chip key={tp} label={tp} active={topic === tp} onPress={() => setTopic(tp)} />
        ))}
      </View>

      <View className="gap-3">
        <Input label="Your name" value={name} onChangeText={setName} placeholder="Full name" />
        <Input
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="10-digit mobile"
        />
        <Input
          label="Anything specific? (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. North-East facing plot, best muhurat next month"
          multiline
          className="h-auto min-h-[72px] py-3"
        />
        <Button title="Request consultation" loading={busy} onPress={submit} />
      </View>
    </Sheet>
  );
}
